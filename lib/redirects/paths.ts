export const REDIRECT_STATUS_CODES = [301, 302, 307, 308] as const;
export type RedirectStatusCode = typeof REDIRECT_STATUS_CODES[number];
export type RedirectMatchType = "exact" | "segment" | "splat";

export type NormalizedRulePath = {
  path: string;
  matchType: RedirectMatchType;
};

const MAX_PATH_LENGTH = 2048;
const INVALID_PERCENT = /%(?![0-9a-fA-F]{2})/;
const UNRESERVED_PERCENT = /%([0-9a-fA-F]{2})/g;
const CONTROL_CHARACTER = /[\u0000-\u001f\u007f]/;
const SEGMENT_TOKEN = /\/:([A-Za-z][A-Za-z0-9_-]*)$/;

function normalizePercentEncoding(value: string): string {
  if (INVALID_PERCENT.test(value)) throw new Error("Path contains invalid percent encoding.");
  return value.replace(UNRESERVED_PERCENT, (match, hex: string) => {
    const character = String.fromCharCode(Number.parseInt(hex, 16));
    return /[A-Za-z0-9._~-]/.test(character) ? character : match.toUpperCase();
  });
}

function encodeUnsafePathCharacters(value: string): string {
  let encoded = "";
  for (const character of value) {
    const codePoint = character.codePointAt(0) ?? 0;
    if (codePoint < 0x20 || codePoint === 0x7f || codePoint > 0x7e || /["<>`{}]/.test(character)) {
      encoded += encodeURIComponent(character).replace(/%[0-9a-f]{2}/gi, match => match.toUpperCase());
    } else {
      encoded += character;
    }
  }
  return encoded;
}

function normalizePlainPath(value: string): string {
  if (!value.startsWith("/") || value.startsWith("//")) {
    throw new Error("Path must start with one slash.");
  }
  if (value.includes("\\")) throw new Error("Backslashes are not allowed in paths.");
  if (value.includes("?") || value.includes("#")) {
    throw new Error("Store query strings and fragments separately from paths.");
  }
  if (CONTROL_CHARACTER.test(value)) throw new Error("Control characters are not allowed in paths.");
  if (value.length > MAX_PATH_LENGTH) throw new Error(`Path cannot exceed ${MAX_PATH_LENGTH} characters.`);

  const normalized = normalizePercentEncoding(encodeUnsafePathCharacters(value)).replace(/\/{2,}/g, "/");
  const segments = normalized.split("/");
  if (segments.some(segment => segment === "." || segment === "..")) {
    throw new Error("Dot path segments are not allowed.");
  }
  return normalized.length > 1 ? normalized.replace(/\/+$/, "") : normalized;
}

/** Normalize an incoming request pathname without treating colons as rule tokens. */
export function normalizeRequestPath(pathname: string): string {
  return normalizePlainPath(pathname.trim());
}

/**
 * Canonical rule syntax:
 *   exact: /old-page
 *   one segment: /blog/:segment
 *   catch all: /blog/:path*
 * The admin and CSV importer may use /blog/* as catch-all shorthand.
 */
export function normalizeRulePath(input: string): NormalizedRulePath {
  let value = input.trim();
  if (!value) throw new Error("Path is required.");
  if (/^[A-Za-z][A-Za-z0-9+.-]*:/.test(value)) {
    throw new Error("Use a same-origin path, not an absolute URL.");
  }
  if (value === "/*") value = "/:path*";
  else if (value.endsWith("/*")) value = `${value.slice(0, -2)}/:path*`;

  let matchType: RedirectMatchType = "exact";
  let token = "";
  let staticPart = value;

  if (value.endsWith("/:path*")) {
    matchType = "splat";
    token = "/:path*";
    staticPart = value.slice(0, -token.length) || "/";
  } else {
    const segment = value.match(SEGMENT_TOKEN);
    if (segment) {
      matchType = "segment";
      token = "/:segment";
      staticPart = value.slice(0, -segment[0].length) || "/";
    }
  }

  if (staticPart.includes(":") || staticPart.includes("*")) {
    throw new Error("Only one terminal segment or catch-all token is allowed.");
  }

  const normalizedStatic = normalizePlainPath(staticPart);
  if (matchType === "exact") {
    if (value.includes(":") || value.includes("*")) {
      throw new Error("Only terminal :segment and :path* patterns are supported.");
    }
    return { path: normalizedStatic, matchType };
  }

  const prefix = normalizedStatic === "/" ? "" : normalizedStatic;
  return { path: `${prefix}${token}`, matchType };
}

export function normalizeDestinationPath(input: string, sourceMatchType: RedirectMatchType): string {
  const destination = normalizeRulePath(input);
  if (destination.matchType !== "exact" && destination.matchType !== sourceMatchType) {
    throw new Error("Destination token must match the source token.");
  }
  if (sourceMatchType === "exact" && destination.matchType !== "exact") {
    throw new Error("An exact source cannot use a destination token.");
  }
  return destination.path;
}

export function matchRulePath(
  pathname: string,
  sourcePath: string,
  matchType: RedirectMatchType,
): string | null {
  if (matchType === "exact") return pathname === sourcePath ? "" : null;

  const token = matchType === "segment" ? "/:segment" : "/:path*";
  const prefix = sourcePath.slice(0, -token.length);
  if (pathname === prefix) return matchType === "splat" ? "" : null;
  if (!pathname.startsWith(`${prefix}/`)) return null;

  const capture = pathname.slice(prefix.length + 1);
  if (matchType === "segment" && (!capture || capture.includes("/"))) return null;
  return capture;
}

export function applyRuleDestination(
  destinationPath: string,
  matchType: RedirectMatchType,
  capture: string,
): string {
  if (matchType === "segment" && destinationPath.endsWith("/:segment")) {
    return normalizeRequestPath(`${destinationPath.slice(0, -"/:segment".length)}/${capture}`);
  }
  if (matchType === "splat" && destinationPath.endsWith("/:path*")) {
    const prefix = destinationPath.slice(0, -"/:path*".length);
    return normalizeRequestPath(capture ? `${prefix}/${capture}` : prefix || "/");
  }
  return destinationPath;
}

export function normalizeImportedUrl(input: string, allowedHosts = ["mogen.co.za", "www.mogen.co.za"]): string {
  const value = input.trim();
  if (value.startsWith("/")) return normalizeRequestPath(value.split(/[?#]/, 1)[0] ?? "/");

  let url: URL;
  try {
    url = new URL(value);
  } catch {
    throw new Error("Import URL is invalid.");
  }
  if (url.protocol !== "https:" && url.protocol !== "http:") throw new Error("Import URL must use HTTP or HTTPS.");
  if (!allowedHosts.includes(url.hostname.toLowerCase())) throw new Error("Import URL must belong to Mogen.");
  return normalizeRequestPath(url.pathname);
}
