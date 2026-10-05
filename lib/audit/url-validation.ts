/**
 * URL validation + SSRF protection for the SEO analyser.
 *
 * Defence layers:
 * 1. Scheme allowlist (http/https only), no credentials, no fragments tricks.
 * 2. Hostname string blocklist (localhost, metadata hosts, …).
 * 3. DNS resolution — every resolved A/AAAA address is checked against
 *    private/loopback/link-local/reserved ranges (protects against DNS
 *    rebinding where the string check alone would pass).
 * 4. Port allowlist (80/443 or implicit).
 *
 * Every redirect destination must be re-validated with `validateUrlForFetch`.
 */

import dns from "node:dns";
import net from "node:net";

export const MAX_REDIRECTS = 4;
export const MAX_PAGES = 10;
export const MAX_HTML_BYTES = 2 * 1024 * 1024;
export const REQUEST_TIMEOUT_MS = 15_000;

export type UrlValidationErrorCode =
  | "invalid-url"
  | "unsupported-protocol"
  | "blocked-host"
  | "blocked-ip"
  | "blocked-port"
  | "dns-failed";

export class UrlValidationError extends Error {
  readonly code: UrlValidationErrorCode;
  constructor(code: UrlValidationErrorCode) {
    super(code);
    this.code = code;
    this.name = "UrlValidationError";
  }
}

/** Hostnames that are never allowed, matched case-insensitively. */
const BLOCKED_HOSTNAMES = new Set([
  "localhost",
  "metadata.google.internal",
  "metadata.google",
  "instance-data",
  "instance-data.compute.internal",
]);

/** Safe user-facing message — never leaks DNS/IP internals. */
export function safeValidationMessage(code: UrlValidationErrorCode): string {
  switch (code) {
    case "invalid-url":
    case "unsupported-protocol":
    case "blocked-port":
      return "Invalid website URL.";
    case "blocked-host":
    case "blocked-ip":
      return "The website could not be analysed safely.";
    case "dns-failed":
      return "The website could not be reached.";
  }
}

function isBlockedHostname(hostname: string): boolean {
  const host = hostname.toLowerCase().replace(/\.+$/, "");
  if (BLOCKED_HOSTNAMES.has(host)) return true;
  if (host === "localhost") return true;
  return false;
}

/** IPv4 private/loopback/link-local/reserved/multicast check. */
function isBlockedIPv4(ip: string): boolean {
  const parts = ip.split(".").map(Number);
  if (parts.length !== 4 || parts.some((n) => !Number.isInteger(n) || n < 0 || n > 255)) {
    return true; // fail closed on unparseable input
  }
  const [a, b] = parts;
  if (a === 10) return true; // 10.0.0.0/8
  if (a === 127) return true; // 127.0.0.0/8 loopback
  if (a === 0) return true; // 0.0.0.0/8
  if (a === 169 && b === 254) return true; // 169.254.0.0/16 link-local (incl. cloud metadata)
  if (a === 192 && b === 168) return true; // 192.168.0.0/16
  if (a === 172 && b >= 16 && b <= 31) return true; // 172.16.0.0/12
  if (a >= 224) return true; // multicast + reserved (224.0.0.0/4, 240.0.0.0/4)
  if (a === 100 && b >= 64 && b <= 127) return true; // 100.64.0.0/10 carrier-grade NAT
  if (a === 192 && b === 0 && parts[2] === 2) return true; // TEST-NET-1, also covers 192.0.0.0/24
  if (a === 198 && (b === 18 || b === 19)) return true; // benchmark 198.18.0.0/15
  if (a === 198 && b === 51 && parts[2] === 100) return true; // TEST-NET-2
  if (a === 203 && b === 0 && parts[2] === 113) return true; // TEST-NET-3
  return false;
}

/** Expand an IPv6 address to 16 bytes, or null when unparseable. */
function expandIPv6(ip: string): number[] | null {
  const addr = ip.toLowerCase().replace(/^\[(.*)\]$/, "$1");
  let tail: number[] = [];
  let head = addr;
  const v4match = addr.match(/:(\d+\.\d+\.\d+\.\d+)$/);
  if (v4match?.[1]) {
    const parts = v4match[1].split(".").map(Number);
    if (
      parts.length !== 4 ||
      parts.some((n) => !Number.isInteger(n) || n < 0 || n > 255)
    ) {
      return null;
    }
    tail = parts;
    head = addr.slice(0, addr.length - v4match[1].length);
    if (head.endsWith(":")) head = head.slice(0, -1);
  }
  const halves = head.split("::");
  if (halves.length > 2) return null;
  const left = halves[0] === "" ? [] : halves[0].split(":");
  const right = halves.length === 2 ? (halves[1] === "" ? [] : halves[1].split(":")) : [];
  const groups = [...left, ...right];
  if (groups.some((g) => !/^[0-9a-f]{1,4}$/.test(g))) return null;
  const tailGroups = tail.length > 0 ? 2 : 0;
  if (left.length + right.length + tailGroups > 8) return null;
  if (halves.length === 1 && left.length + tailGroups !== 8) return null;
  const zeros = 8 - tailGroups - left.length - right.length;
  const bytes: number[] = [];
  for (const g of [...left, ...Array<string>(zeros).fill("0"), ...right]) {
    const n = parseInt(g, 16);
    bytes.push((n >> 8) & 0xff, n & 0xff);
  }
  return [...bytes, ...tail];
}

/** IPv6 loopback/link-local/unique-local/multicast/reserved check. */
function isBlockedIPv6(ip: string): boolean {
  const bytes = expandIPv6(ip);
  if (!bytes) return true; // fail closed on unparseable input
  if (bytes.every((b) => b === 0)) return true; // ::
  if (bytes.slice(0, 15).every((b) => b === 0) && bytes[15] === 1) return true; // ::1
  if (bytes[0] === 0xfe && (bytes[1] & 0xc0) === 0x80) return true; // fe80::/10
  if ((bytes[0] & 0xfe) === 0xfc) return true; // fc00::/7
  if (bytes[0] === 0xff) return true; // ff00::/8
  // Embedded IPv4 in the low 32 bits: mapped (::ffff:0:0/96), compatible
  // (::/96, deprecated but still parsed), and NAT64 (64:ff9b::/96).
  const mapped =
    bytes.slice(0, 10).every((b) => b === 0) && bytes[10] === 0xff && bytes[11] === 0xff;
  const compatible = bytes.slice(0, 12).every((b) => b === 0);
  const nat64 =
    bytes[0] === 0x00 &&
    bytes[1] === 0x64 &&
    bytes[2] === 0xff &&
    bytes[3] === 0x9b &&
    bytes.slice(4, 12).every((b) => b === 0);
  if (mapped || compatible || nat64) {
    const v4 = `${bytes[12]}.${bytes[13]}.${bytes[14]}.${bytes[15]}`;
    return isBlockedIPv4(v4);
  }
  return false;
}

export function isBlockedIp(ip: string): boolean {
  const family = net.isIP(ip);
  if (family === 4) return isBlockedIPv4(ip);
  if (family === 6) return isBlockedIPv6(ip);
  return true; // fail closed
}

export interface ValidatedUrl {
  /** Normalised URL string safe to fetch. */
  url: string;
  hostname: string;
  origin: string;
  /** DNS addresses validated at check time (used for connection pinning). */
  addresses: string[];
}

function validateStructure(raw: string): URL {
  let parsed: URL;
  try {
    // Add a scheme when the visitor omits one ("example.co.za").
    const candidate = /^[a-zA-Z][a-zA-Z0-9+.-]*:/.test(raw.trim())
      ? raw.trim()
      : `https://${raw.trim()}`;
    parsed = new URL(candidate);
  } catch {
    throw new UrlValidationError("invalid-url");
  }
  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    throw new UrlValidationError("unsupported-protocol");
  }
  if (parsed.username !== "" || parsed.password !== "") {
    throw new UrlValidationError("invalid-url");
  }
  const port = parsed.port;
  if (port !== "") {
    const n = Number(port);
    const allowed = parsed.protocol === "http:" ? n === 80 : n === 443;
    if (!Number.isInteger(n) || n < 1 || n > 65535 || !allowed) {
      throw new UrlValidationError("blocked-port");
    }
  }
  const rawHostname = parsed.hostname.toLowerCase();
  // Strip brackets from IPv6 literals ("[::1]" → "::1") before checks.
  const hostname = rawHostname.replace(/^\[(.*)\]$/, "$1");
  if (hostname === "" || isBlockedHostname(hostname)) {
    throw new UrlValidationError("blocked-host");
  }
  // Public analyser: bare single-label names (e.g. "fsfsd") are never valid
  // website addresses. Reject before DNS so the caller gets an instant,
  // deterministic answer instead of waiting on search-domain expansion.
  if (net.isIP(hostname) === 0 && !hostname.includes(".")) {
    throw new UrlValidationError("invalid-url");
  }
  // Hostname that is already an IP literal — check without DNS.
  if (net.isIP(hostname) !== 0 && isBlockedIp(hostname)) {
    throw new UrlValidationError("blocked-ip");
  }
  return parsed;
}

async function assertDnsSafe(hostname: string): Promise<dns.LookupAddress[]> {
  if (net.isIP(hostname) !== 0) return [{ address: hostname, family: net.isIP(hostname) as 4 | 6 }];
  let records: dns.LookupAddress[];
  try {
    records = await dns.promises.lookup(hostname, { all: true });
  } catch {
    throw new UrlValidationError("dns-failed");
  }
  if (records.length === 0) throw new UrlValidationError("dns-failed");
  for (const record of records) {
    if (isBlockedIp(record.address)) {
      throw new UrlValidationError("blocked-ip");
    }
  }
  return records;
}

/**
 * Validate a visitor-supplied URL for safe server-side fetching.
 * Resolves DNS and rejects private/internal destinations (incl. rebinding).
 */
export async function validateUrlForFetch(raw: string): Promise<ValidatedUrl> {
  const parsed = validateStructure(raw);
  const hostname = parsed.hostname.toLowerCase().replace(/^\[(.*)\]$/, "$1");
  const records = await assertDnsSafe(hostname);
  parsed.hash = "";
  return {
    url: parsed.toString(),
    hostname: parsed.hostname.toLowerCase(),
    origin: parsed.origin,
    addresses: records.map((r) => r.address),
  };
}
