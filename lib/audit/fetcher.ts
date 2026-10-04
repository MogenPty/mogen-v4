/**
 * Safe server-side fetcher for the SEO analyser.
 *
 * Guarantees:
 * - Only http/https URLs validated by `validateUrlForFetch`.
 * - Every redirect hop re-validated (DNS rebinding protection).
 * - Max 4 redirects, full chain recorded.
 * - Per-response body cap (2 MB default) enforced while streaming.
 * - Request timeout via AbortSignal.
 */

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
  fetchFn?: typeof fetch;
  timeoutMs?: number;
  maxBytes?: number;
  maxRedirects?: number;
}

function toSafeCode(error: unknown): SafeFetchErrorCode {
  if (error instanceof UrlValidationError) {
    if (error.code === "dns-failed") return "unreachable";
    return "unsafe-target";
  }
  return "unreachable";
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
 * Fetch a URL safely: validates the target, follows up to `maxRedirects`
 * manually (validating each hop), enforces timeout + body cap.
 */
export async function safeFetch(
  rawUrl: string,
  deps: FetchDeps = {},
): Promise<FetchedResponse> {
  const {
    fetchFn = fetch,
    timeoutMs = REQUEST_TIMEOUT_MS,
    maxBytes = MAX_HTML_BYTES,
    maxRedirects = MAX_REDIRECTS,
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
    let response: Response;
    try {
      response = await fetchFn(target, {
        redirect: "manual",
        signal: AbortSignal.timeout(timeoutMs),
        headers: { "User-Agent": BROWSER_UA, Accept: "text/html,*/*" },
      });
    } catch (error) {
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
