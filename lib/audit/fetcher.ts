/**
 * Safe server-side fetcher for the SEO analyser.
 *
 * Guarantees:
 * - Only http/https URLs validated by `validateUrlForFetch`.
 * - Every redirect hop re-validated (DNS rebinding protection).
 * - The TCP connection goes only to a validated address: each request uses
 *   an undici dispatcher whose lookup serves the validated IPs, closing the
 *   validate-vs-connect DNS race. TLS SNI and the Host header still use the
 *   original hostname (undici derives those from the URL, not the lookup).
 * - Max 4 redirects, full chain recorded.
 * - Per-response body cap (2 MB default) enforced while streaming.
 * - Per-request timeout, optionally combined with an overall audit deadline.
 */

import dns from "node:dns";
import net from "node:net";
import { Agent, fetch as undiciFetch } from "undici";
import {
  MAX_HTML_BYTES,
  MAX_REDIRECTS,
  REQUEST_TIMEOUT_MS,
  safeValidationMessage,
  UrlValidationError,
  validateUrlForFetch,
  type ValidatedUrl,
} from "./url-validation";

export interface FetchedResponse {
  finalUrl: string;
  redirects: { url: string; status: number }[];
  status: number;
  contentType: string | null;
  body: string;
  truncated: boolean;
}

/** fetch-compatible; init may carry an undici dispatcher for IP pinning. */
export type FetchFunction = (
  input: string | URL,
  init?: RequestInit & { dispatcher?: unknown },
) => Promise<Response>;

export type SafeFetchErrorCode =
  | "invalid-url"
  | "unsafe-target"
  | "unreachable"
  | "too-many-redirects"
  | "timeout"
  | "too-large"
  | "bad-status";

export class SafeFetchError extends Error {
  readonly code: SafeFetchErrorCode;
  constructor(code: SafeFetchErrorCode) {
    super(code);
    this.code = code;
    this.name = "SafeFetchError";
  }
}

/** Safe user-facing message — no stack traces, paths, or DNS internals. */
export function safeFetchMessage(code: SafeFetchErrorCode): string {
  switch (code) {
    case "invalid-url":
    case "unsafe-target":
      return "The website could not be analysed safely.";
    case "unreachable":
    case "bad-status":
      return "The website could not be reached.";
    case "too-many-redirects":
      return "The website redirected too many times.";
    case "timeout":
      return "The analysis timed out.";
    case "too-large":
      return "The website response was too large.";
  }
}

const BROWSER_UA =
  "Mozilla/5.0 (compatible; MogenSEOAnalyser/1.0; +https://www.mogen.co.za)";

interface FetchDeps {
  fetchFn?: FetchFunction;
  timeoutMs?: number;
  maxBytes?: number;
  maxRedirects?: number;
  /** Overall deadline (e.g. the whole audit); combined with the per-request timeout. */
  signal?: AbortSignal;
}

function toSafeCode(error: unknown): SafeFetchErrorCode {
  if (error instanceof UrlValidationError) {
    if (error.code === "dns-failed") return "unreachable";
    return "unsafe-target";
  }
  return "unreachable";
}

type LookupCallback = (
  err: NodeJS.ErrnoException | null,
  address: string | dns.LookupAddress[],
  family: number,
) => void;

/**
 * DNS lookup that serves ONLY validated addresses and fails closed on
 * anything else. Undici still derives TLS SNI and the Host header from the
 * request URL, so the original hostname is preserved end-to-end.
 */
export function pinnedLookup(addresses: string[]) {
  return (
    hostname: string,
    options: dns.LookupOptions,
    callback: LookupCallback,
  ): void => {
    const family = typeof options === "number" ? options : (options.family ?? 0);
    const pool = [
      ...new Set(
        addresses.filter((a) => family === 0 || net.isIP(a) === family),
      ),
    ];
    if (pool.length === 0) {
      const err = new Error(
        `DNS lookup blocked for ${hostname}`,
      ) as NodeJS.ErrnoException;
      err.code = "ENOTFOUND";
      callback(err, "", 0);
      return;
    }
    if (typeof options === "object" && options.all) {
      callback(
        null,
        pool.map((address) => ({
          address,
          family: net.isIP(address) as 4 | 6,
        })),
        0,
      );
      return;
    }
    callback(null, pool[0], net.isIP(pool[0]));
  };
}

/** Dispatcher whose connections can only go to validated addresses. */
export function pinnedDispatcher(addresses: string[]): Agent {
  return new Agent({
    connect: { lookup: pinnedLookup(addresses) },
  });
}

async function readCappedBody(
  response: Response,
  maxBytes: number,
  timeoutMs: number,
): Promise<{ text: string; truncated: boolean }> {
  const reader = response.body?.getReader();
  if (!reader) {
    const text = await response.text();
    const bytes = Buffer.byteLength(text, "utf8");
    if (bytes > maxBytes) {
      return { text: text.slice(0, maxBytes), truncated: true };
    }
    return { text, truncated: false };
  }
  const chunks: Uint8Array[] = [];
  let total = 0;
  const deadline = Date.now() + timeoutMs;
  for (;;) {
    const remaining = deadline - Date.now();
    if (remaining <= 0) throw new SafeFetchError("timeout");
    const result = await Promise.race([
      reader.read(),
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new SafeFetchError("timeout")), remaining),
      ),
    ]);
    if (result.done) break;
    total += result.value.byteLength;
    if (total > maxBytes) {
      try {
        await reader.cancel();
      } catch {
        // ignore cancellation errors
      }
      const buf = Buffer.concat(chunks.map((c) => Buffer.from(c)));
      return { text: buf.toString("utf8"), truncated: true };
    }
    chunks.push(result.value);
  }
  const buf = Buffer.concat(chunks.map((c) => Buffer.from(c)));
  return { text: buf.toString("utf8"), truncated: false };
}

/**
 * Fetch a URL safely: validates the target, pins the connection to a
 * validated address, follows up to `maxRedirects` manually (validating each
 * hop and re-pinning), enforces timeout + body cap.
 */
export async function safeFetch(
  rawUrl: string,
  deps: FetchDeps = {},
): Promise<FetchedResponse> {
  const {
    fetchFn = undiciFetch as unknown as FetchFunction,
    timeoutMs = REQUEST_TIMEOUT_MS,
    maxBytes = MAX_HTML_BYTES,
    maxRedirects = MAX_REDIRECTS,
    signal,
  } = deps;

  let current: ValidatedUrl;
  try {
    current = await validateUrlForFetch(rawUrl);
  } catch (error) {
    throw new SafeFetchError(toSafeCode(error));
  }

  const redirects: { url: string; status: number }[] = [];
  let target = current.url;

  for (let hop = 0; hop <= maxRedirects; hop += 1) {
    // Per-hop dispatcher pinned to the addresses validated for this hop.
    const dispatcher = pinnedDispatcher(current.addresses);
    const requestSignal =
      signal !== undefined
        ? AbortSignal.any([signal, AbortSignal.timeout(timeoutMs)])
        : AbortSignal.timeout(timeoutMs);
    let response: Response;
    try {
      response = await fetchFn(target, {
        redirect: "manual",
        signal: requestSignal,
        headers: { "User-Agent": BROWSER_UA, Accept: "text/html,*/*" },
        dispatcher,
      });
      await dispatcher.close();
    } catch (error) {
      try {
        await dispatcher.close();
      } catch {
        // ignore close errors
      }
      if (error instanceof SafeFetchError) throw error;
      if (
        error instanceof DOMException &&
        (error.name === "TimeoutError" || error.name === "AbortError")
      ) {
        throw new SafeFetchError("timeout");
      }
      throw new SafeFetchError("unreachable");
    }

    const status = response.status;
    if (status >= 300 && status < 400) {
      if (hop === maxRedirects) throw new SafeFetchError("too-many-redirects");
      const location = response.headers.get("location");
      if (!location) throw new SafeFetchError("unreachable");
      let next: string;
      try {
        next = new URL(location, target).toString();
      } catch {
        throw new SafeFetchError("unreachable");
      }
      try {
        current = await validateUrlForFetch(next);
      } catch (error) {
        throw new SafeFetchError(toSafeCode(error));
      }
      redirects.push({ url: target, status });
      target = current.url;
      continue;
    }

    const contentType = response.headers.get("content-type");
    let body = "";
    let truncated = false;
    try {
      ({ text: body, truncated } = await readCappedBody(response, maxBytes, timeoutMs));
    } catch (error) {
      if (error instanceof SafeFetchError) throw error;
      throw new SafeFetchError("timeout");
    }
    return { finalUrl: target, redirects, status, contentType, body, truncated };
  }
  throw new SafeFetchError("too-many-redirects");
}

/** Map validation errors to safe messages for API responses. */
export function safeErrorMessage(error: unknown): string {
  if (error instanceof SafeFetchError) return safeFetchMessage(error.code);
  if (error instanceof UrlValidationError) {
    return safeValidationMessage(error.code);
  }
  return "The website could not be analysed.";
}
