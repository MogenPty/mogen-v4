/**
 * Cloudflare Turnstile server-side verification.
 *
 * Pure module (no `server-only` import) so the verify logic is unit
 * testable. The API route wires it to the real environment + fetch.
 */

export interface TurnstileVerifyOptions {
  token: unknown;
  remoteip?: string;
  secret: string | undefined;
  expectedAction: string;
  expectedHostnames: Set<string>;
  fetchFn?: typeof fetch;
}

export type TurnstileVerifyResult =
  | { ok: true; hostname: string }
  | { ok: false; reason: "missing-token" | "misconfigured" | "rejected" | "error" };

interface SiteverifyResponse {
  success?: boolean;
  action?: string;
  hostname?: string;
}

/** Canonical siteverify gate. Fails closed on every failure path. */
export async function verifyTurnstileToken(
  options: TurnstileVerifyOptions,
): Promise<TurnstileVerifyResult> {
  const {
    token,
    remoteip,
    secret,
    expectedAction,
    expectedHostnames,
    fetchFn = fetch,
  } = options;

  if (
    typeof token !== "string" ||
    token.length === 0 ||
    token.length > 2048
  ) {
    return { ok: false, reason: "missing-token" };
  }
  if (!secret || expectedHostnames.size === 0) {
    return { ok: false, reason: "misconfigured" };
  }

  let result: SiteverifyResponse;
  try {
    const response = await fetchFn(
      "https://challenges.cloudflare.com/turnstile/v0/siteverify",
      {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        signal: AbortSignal.timeout(10_000),
        body: new URLSearchParams({
          secret,
          response: token,
          ...(remoteip ? { remoteip } : {}),
        }),
      },
    );
    if (!response.ok) return { ok: false, reason: "error" };
    result = (await response.json()) as SiteverifyResponse;
  } catch {
    // Network error, non-2xx transport, or non-JSON body. Fail closed.
    return { ok: false, reason: "error" };
  }

  if (
    result.success !== true ||
    result.action !== expectedAction ||
    typeof result.hostname !== "string" ||
    !expectedHostnames.has(result.hostname)
  ) {
    return { ok: false, reason: "rejected" };
  }
  return { ok: true, hostname: result.hostname };
}

/** Parse the deployment-specific frontend hostname allowlist. */
export function parseExpectedHostnames(value: string | undefined): Set<string> {
  return new Set(
    (value ?? "")
      .split(",")
      .map((hostname) => hostname.trim())
      .filter(Boolean),
  );
}
