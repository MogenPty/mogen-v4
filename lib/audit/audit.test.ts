import { afterEach, describe, expect, it, vi } from "vitest";
import { runAudit } from "./audit";
import { SafeFetchError } from "./fetcher";
import { htmlResponse, mockPublicDns, mockResponse } from "./test-helpers";

afterEach(() => {
  vi.restoreAllMocks();
});

function pageHtml(title: string, links: string[]): string {
  return `<!DOCTYPE html><html lang="en"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${title}</title>
<meta name="description" content="A well written meta description that falls inside the recommended length band.">
<link rel="canonical" href="CANONICAL">
</head><body><h1>${title}</h1>
<p>${"Body copy about the business and its services for testing purposes. ".repeat(20)}</p>
${links.map((l) => `<a href="${l}">link</a>`).join("")}
</body></html>`;
}

describe("runAudit crawl limits", () => {
  it("analyses at most 10 pages on a 12-page fixture site", async () => {
    mockPublicDns();
    const sitePages = Array.from({ length: 12 }, (_, i) => `/page-${i}`);
    const fetchFn = (async (input: string | URL | Request) => {
      const url = new URL(String(input));
      if (url.pathname === "/robots.txt" || url.pathname === "/sitemap.xml" || url.pathname === "/llms.txt") {
        return mockResponse("not found", { status: 404, contentType: "text/plain" });
      }
      const title = `Test Page Title That Is Long Enough ${url.pathname}`;
      const canonical = `https://example.com${url.pathname}`;
      const links = url.pathname === "/" ? sitePages : [];
      return htmlResponse(pageHtml(title, links).replace("CANONICAL", canonical));
    }) as typeof fetch;

    const result = await runAudit("https://example.com/", { fetchFn, now: () => "2026-10-04T00:00:00.000Z", skipPagespeed: true });
    expect(result.crawl.pagesAnalysed).toBeLessThanOrEqual(10);
    expect(result.crawl.pagesAnalysed).toBeGreaterThan(1);
    expect(result.findings).toHaveLength(37);
    expect(result.summary.applicable).toBeGreaterThan(0);
    expect(result.quadrants).toHaveLength(4);
  });

  it("returns deterministic scores for identical fixtures", async () => {
    mockPublicDns();
    const fetchFn = (async (input: string | URL | Request) => {
      const url = new URL(String(input));
      if (url.pathname !== "/") {
        return mockResponse("not found", { status: 404, contentType: "text/plain" });
      }
      return htmlResponse(pageHtml("Example Business Provides Quality Services Online", []).replace(
        "CANONICAL", "https://example.com/",
      ));
    }) as typeof fetch;
    const opts = { fetchFn, now: () => "2026-10-04T00:00:00.000Z" as const, skipPagespeed: true as const };
    const a = await runAudit("https://example.com/", opts);
    const b = await runAudit("https://example.com/", opts);
    expect(a.summary).toEqual(b.summary);
    expect(a.findings.map((f) => [f.ruleId, f.status])).toEqual(
      b.findings.map((f) => [f.ruleId, f.status]),
    );
  });

  it("fetches the entry URL only once", async () => {
    mockPublicDns();
    const calls: string[] = [];
    const fetchFn = (async (input: string | URL | Request) => {
      const url = String(input);
      calls.push(url);
      if (new URL(url).pathname !== "/") {
        return mockResponse("not found", { status: 404, contentType: "text/plain" });
      }
      return htmlResponse(
        pageHtml("Example Business Provides Quality Services Online", []).replace(
          "CANONICAL",
          "https://example.com/",
        ),
      );
    }) as typeof fetch;
    await runAudit("https://example.com/", {
      fetchFn,
      now: () => "2026-10-04T00:00:00.000Z" as const,
      skipPagespeed: true,
    });
    expect(calls.filter((u) => u === "https://example.com/")).toHaveLength(1);
  });

  it("aborts the audit when the overall deadline passes", async () => {
    mockPublicDns();
    const hanging = (async (_input: string | URL | Request, init?: RequestInit) => {
      await new Promise<never>((_, reject) => {
        const onAbort = (): void =>
          reject(new DOMException("aborted", "AbortError"));
        if (init?.signal?.aborted === true) {
          onAbort();
          return;
        }
        init?.signal?.addEventListener("abort", onAbort, { once: true });
      });
      throw new Error("unreachable");
    }) as typeof fetch;
    await expect(
      runAudit("https://example.com/", {
        fetchFn: hanging,
        now: () => "2026-10-04T00:00:00.000Z" as const,
        timeoutMs: 50,
        skipPagespeed: true,
      }),
    ).rejects.toBeInstanceOf(SafeFetchError);
  });
});
