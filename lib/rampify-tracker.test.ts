import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

function readSource(relativePath: string): string {
  return readFileSync(join(process.cwd(), relativePath), "utf8");
}

/**
 * Rampify tracking — client tracker.js (humans with JS) + server proxy.ts
 * (bots and LLM fetchers). The two are complementary, not interchangeable:
 * tracker.js never sees non-JS traffic; the proxy deliberately skips
 * normal browser traffic, so there is no double-counting.
 */
describe("rampify tracker — client snippet (all pages)", () => {
  it("loads tracker.js deferred in the root layout head", () => {
    const layout = readSource("app/layout.tsx");
    expect(layout).toContain("https://www.rampify.dev/tracker.js");
    expect(layout).toContain("data-site-id=");
    // Deferred so it never blocks parsing; static site id only (public).
    expect(layout).toContain("defer");
  });

  it("exposes no secret in the client snippet", () => {
    const layout = readSource("app/layout.tsx");
    expect(layout).not.toContain("sk_live_");
    expect(layout).not.toContain("RAMPIFY_API_KEY");
  });
});

describe("rampify tracker — server proxy (bots/LLM fetchers)", () => {
  it("lives at the Next.js 16 proxy location with a pass-through handler", () => {
    const proxy = readSource("proxy.ts");
    expect(proxy).toContain("export function proxy");
    expect(proxy).toContain("NextResponse.next()");
    expect(proxy).toContain("waitUntil");
    expect(proxy).toContain("@vercel/functions");
  });

  it("fails silent without the key and never blocks the response", () => {
    const proxy = readSource("proxy.ts");
    expect(proxy).toContain("if (!apiKey) return");
    expect(proxy).toContain(".catch(");
    // Fire-and-forget POST carrying only the server-side secret.
    expect(proxy).toContain("Authorization");
    expect(proxy).toContain("process.env.RAMPIFY_API_KEY");
    expect(proxy).not.toContain("NEXT_PUBLIC_");
  });

  it("tracks bot/LLM traffic only, skipping assets and normal browsers", () => {
    const proxy = readSource("proxy.ts");
    expect(proxy).toContain("ChatGPT-User");
    expect(proxy).toContain("Claude-User");
    expect(proxy).toContain("Googlebot");
    expect(proxy).toContain("shouldSkipPath");
    expect(proxy).toContain("/_next/");
  });

  it("strips query strings from tracked URLs and referers", () => {
    const proxy = readSource("proxy.ts");
    // Query params can carry tokens/PII and fragment pageview rows;
    // canonical URLs exclude them (see lib/seo.ts).
    expect(proxy).toContain("originAndPath");
    expect(proxy).toContain("parsed.origin");
    expect(proxy).toContain("parsed.pathname");
    expect(proxy).not.toContain("url: request.url,");
    expect(proxy).not.toContain("ref: request.headers.get('referer'),");
  });

  it("documents the server key without committing a value", () => {
    const example = readSource(".env.example");
    expect(example).toContain("RAMPIFY_API_KEY");
    // Placeholder only — a real key must never be committed.
    expect(example).not.toMatch(/RAMPIFY_API_KEY=\s*sk_live_/);
  });
});
