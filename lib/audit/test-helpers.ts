/** Shared test helpers for the audit engine (not a test file itself). */
import dns from "node:dns";
import { vi } from "vitest";

/** Resolve every hostname to a public IP so validation never hits real DNS. */
export function mockPublicDns(ip = "93.184.216.34"): void {
  vi.spyOn(dns.promises, "lookup").mockImplementation(
    (async () => [{ address: ip, family: 4 }]) as unknown as typeof dns.promises.lookup,
  );
}

/** Minimal Response stub for fetchFn mocks. */
export function mockResponse(
  body: string,
  init: { status?: number; contentType?: string; location?: string } = {},
): Response {
  const headers = new Headers();
  if (init.contentType !== undefined) headers.set("content-type", init.contentType);
  if (init.location !== undefined) headers.set("location", init.location);
  return new Response(body, { status: init.status ?? 200, headers });
}

export function htmlResponse(html: string, status = 200): Response {
  return mockResponse(html, { status, contentType: "text/html; charset=utf-8" });
}
