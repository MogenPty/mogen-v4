import { describe, expect, it, vi, afterEach } from "vitest";
import {
  buildPageSpeedRequestUrl,
  fetchPageSpeed,
  fetchPageSpeedStrategies,
  getPageSpeedApiKey,
  hasPageSpeedEvidence,
  inpAvailability,
  INP_LAB_UNAVAILABLE_NOTE,
  normalizePageSpeedResponse,
  PAGESPEED_API_URL,
  type PageSpeedAnalysis,
  type PageSpeedEvidence,
} from "./pagespeed";
import { runChecks, type AnalysisInput } from "./checks";
import { runAudit } from "./audit";
import { parsePage } from "./parser";
import { renderTechnicalPdf } from "./pdf";
import { htmlResponse, mockPublicDns, mockResponse } from "./test-helpers";

afterEach(() => {
  vi.restoreAllMocks();
});

const NOW = "2026-10-04T00:00:00.000Z";

/**
 * Realistic Lighthouse *lab* fixture: LCP/FCP/CLS/TBT/Speed Index/TTFB are
 * present, INP is absent — exactly what the live lab runs returned.
 * Pass withInp:true to simulate a lab result that does carry an INP audit.
 */
function samplePsiJson(options: { withInp?: boolean; perfScore?: number } = {}) {
  const { withInp = false, perfScore = 0.92 } = options;
  return {
    lighthouseResult: {
      fetchTime: NOW,
      lighthouseVersion: "12.4.0",
      requestedUrl: "https://example.com/",
      finalUrl: "https://example.com/",
      categories: {
        performance: { score: perfScore },
        accessibility: { score: 0.95 },
        "best-practices": { score: 0.9 },
        seo: { score: 0.9 },
      },
      audits: {
        "largest-contentful-paint": { id: "largest-contentful-paint", title: "LCP", numericValue: 2100, displayValue: "2.1 s" },
        ...(withInp
          ? { "interaction-to-next-paint": { id: "interaction-to-next-paint", title: "INP", numericValue: 180, displayValue: "180 ms" } }
          : {}),
        "cumulative-layout-shift": { id: "cumulative-layout-shift", title: "CLS", numericValue: 0.04, displayValue: "0.04" },
        "first-contentful-paint": { id: "first-contentful-paint", title: "FCP", numericValue: 1500, displayValue: "1.5 s" },
        "server-response-time": { id: "server-response-time", title: "TTFB", numericValue: 400, displayValue: "0.4 s" },
        "speed-index": { id: "speed-index", title: "Speed Index", numericValue: 2800, displayValue: "2.8 s" },
        "total-blocking-time": { id: "total-blocking-time", title: "TBT", numericValue: 120, displayValue: "120 ms" },
      },
    },
  };
}

function strategyEvidence(
  strategy: "mobile" | "desktop",
  perfScore = 0.92,
): PageSpeedEvidence {
  return {
    source: "pagespeed",
    provider: "google-pagespeed-insights",
    version: "12.4.0",
    fetchedAt: NOW,
    url: "https://example.com/",
    strategy,
    categories: { performance: perfScore, accessibility: 0.95, bestPractices: 0.9, seo: 0.9 },
    metrics: { lcpMs: 2100, inpMs: null, cls: 0.04, fcpMs: 1500, ttfbMs: 400, speedIndexMs: 2800, totalBlockingTimeMs: 120 },
    audits: [],
  };
}

function analysisFixture(
  overrides: Partial<PageSpeedAnalysis> = {},
): PageSpeedAnalysis {
  return {
    provider: "google-pagespeed-insights",
    url: "https://example.com/",
    fetchedAt: NOW,
    mobile: strategyEvidence("mobile"),
    desktop: strategyEvidence("desktop", 0.98),
    mobileReason: null,
    desktopReason: null,
    ...overrides,
  };
}

function psiOkResponse(json: unknown, status = 200): Response {
  return new Response(JSON.stringify(json), {
    status,
    headers: { "content-type": "application/json" },
  });
}

function baseInput(): AnalysisInput {
  const page = parsePage(
    "https://example.com/",
    200,
    `<!DOCTYPE html><html lang="en"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Example Business Provides Quality Services Online</title>
<meta name="description" content="A well written meta description that falls inside the recommended length band for display.">
<link rel="canonical" href="https://example.com/">
</head><body><h1>Welcome</h1>
<p>${"Substantive marketing copy about the business and its services. ".repeat(30)}</p>
<a href="/about">About</a><a href="/contact">Contact</a><a href="/services">Services</a>
</body></html>`,
  );
  return {
    now: NOW,
    finalUrl: "https://example.com/",
    origin: "https://example.com",
    redirects: [],
    pages: [page],
    robots: {
      url: "https://example.com/robots.txt", status: 200, contentType: "text/plain",
      body: "User-agent: *\nAllow: /", sitemapRefs: [], disallowRules: [],
      llmsTxtDetected: false,
    },
    sitemap: {
      url: null, status: null, contentType: null, validXml: false, kind: "unknown",
      discoveredUrls: [], invalidEntries: 0, duplicateUrls: 0, offOriginUrls: 0,
    },
    canonicalTargets: new Map([
      ["https://example.com/", { ok: true, status: 200, sameOrigin: true, selfCanonical: true }],
    ]),
  };
}

describe("pagespeed configuration", () => {
  it("reads the API key from server-side environment", () => {
    expect(getPageSpeedApiKey({ PAGESPEED_API_KEY: " secret " } as unknown as NodeJS.ProcessEnv)).toBe("secret");
    expect(getPageSpeedApiKey({} as unknown as NodeJS.ProcessEnv)).toBeNull();
    expect(getPageSpeedApiKey({ PAGESPEED_API_KEY: "   " } as unknown as NodeJS.ProcessEnv)).toBeNull();
  });

  it("missing API key fails both strategies without any request", async () => {
    let calls = 0;
    const analysis = await fetchPageSpeedStrategies("https://example.com/", {
      apiKey: null,
      fetchFn: async () => {
        calls += 1;
        return psiOkResponse(samplePsiJson());
      },
    });
    expect(calls).toBe(0);
    expect(analysis.mobile).toBeNull();
    expect(analysis.desktop).toBeNull();
    expect(analysis.mobileReason).toBe("PageSpeed API key not configured");
    expect(analysis.desktopReason).toBe("PageSpeed API key not configured");
    expect(hasPageSpeedEvidence(analysis)).toBe(false);
    const findings = runChecks(baseInput());
    expect(findings.find((f) => f.ruleId === "performance-lab")?.status).toBe("NOT_ASSESSED");
  });

  it("never exposes the API key in normalized output", async () => {
    const analysis = await fetchPageSpeedStrategies("https://example.com/", {
      apiKey: "super-secret-key",
      fetchFn: async () => psiOkResponse(samplePsiJson()),
    });
    expect(analysis.mobile).not.toBeNull();
    expect(JSON.stringify(analysis)).not.toContain("super-secret-key");
  });
});

describe("pagespeed response parsing", () => {
  it("normalizes a mobile response correctly", () => {
    const outcome = normalizePageSpeedResponse(samplePsiJson(), {
      url: "https://example.com/",
      strategy: "mobile",
      fetchedAt: NOW,
    });
    expect(outcome.ok).toBe(true);
    if (!outcome.ok) return;
    expect(outcome.evidence.strategy).toBe("mobile");
    expect(outcome.evidence.categories.performance).toBe(0.92);
    expect(outcome.evidence.metrics.lcpMs).toBe(2100);
    expect(outcome.evidence.metrics.cls).toBe(0.04);
    expect(outcome.evidence.metrics.totalBlockingTimeMs).toBe(120);
    expect(outcome.evidence.provider).toBe("google-pagespeed-insights");
  });

  it("normalizes a desktop response with its own scores", () => {
    const outcome = normalizePageSpeedResponse(samplePsiJson({ perfScore: 0.98 }), {
      url: "https://example.com/",
      strategy: "desktop",
      fetchedAt: NOW,
    });
    expect(outcome.ok).toBe(true);
    if (!outcome.ok) return;
    expect(outcome.evidence.strategy).toBe("desktop");
    expect(outcome.evidence.categories.performance).toBe(0.98);
  });

  it("keeps lab INP unavailable instead of inventing a value", () => {
    const outcome = normalizePageSpeedResponse(samplePsiJson(), {
      url: "https://example.com/",
      strategy: "mobile",
      fetchedAt: NOW,
    });
    expect(outcome.ok).toBe(true);
    if (!outcome.ok) return;
    // Realistic lab run: TBT present, INP absent — and never derived.
    expect(outcome.evidence.metrics.totalBlockingTimeMs).toBe(120);
    expect(outcome.evidence.metrics.inpMs).toBeNull();
    expect(inpAvailability(outcome.evidence.metrics)).toBe("not-in-lab-run");
  });

  it("extracts INP when the lab result actually contains it", () => {
    const outcome = normalizePageSpeedResponse(samplePsiJson({ withInp: true }), {
      url: "https://example.com/",
      strategy: "mobile",
      fetchedAt: NOW,
    });
    expect(outcome.ok).toBe(true);
    if (!outcome.ok) return;
    expect(outcome.evidence.metrics.inpMs).toBe(180);
    expect(inpAvailability(outcome.evidence.metrics)).toBe("available");
  });

  it("consumes the relevant Lighthouse categories", () => {
    const outcome = normalizePageSpeedResponse(samplePsiJson(), {
      url: "https://example.com/",
      strategy: "mobile",
      fetchedAt: NOW,
    });
    expect(outcome.ok).toBe(true);
    if (!outcome.ok) return;
    expect(outcome.evidence.categories).toEqual({
      performance: 0.92,
      accessibility: 0.95,
      bestPractices: 0.9,
      seo: 0.9,
    });
  });

  it("malformed response does not crash", async () => {
    const outcome = await fetchPageSpeed("https://example.com/", {
      apiKey: "k",
      fetchFn: async () => psiOkResponse({ nope: true }),
    });
    expect(outcome.ok).toBe(false);
    if (!outcome.ok) expect(outcome.reason).toBe("Lighthouse data unavailable");
  });
});

describe("strategy handling", () => {
  it("requests both strategies for the exact final URL, exactly once each", async () => {
    const seen: string[] = [];
    const fetchFn = async (input: string | URL) => {
      seen.push(String(input));
      return psiOkResponse(samplePsiJson());
    };
    const analysis = await fetchPageSpeedStrategies("https://example.com/final-page", {
      apiKey: "k",
      fetchFn,
    });
    expect(seen).toHaveLength(2);
    const strategies = seen.map((s) => new URL(s).searchParams.get("strategy")).sort();
    expect(strategies).toEqual(["desktop", "mobile"]);
    for (const s of seen) {
      const req = new URL(s);
      expect(`${req.origin}${req.pathname}`).toBe(PAGESPEED_API_URL);
      expect(req.searchParams.get("url")).toBe("https://example.com/final-page");
      expect(req.searchParams.getAll("category").sort()).toEqual(
        ["accessibility", "best-practices", "performance", "seo"].sort(),
      );
    }
    expect(analysis.mobile?.strategy).toBe("mobile");
    expect(analysis.desktop?.strategy).toBe("desktop");
  });

  it("keeps mobile and desktop evidence separate (never averaged)", async () => {
    const analysis = await fetchPageSpeedStrategies("https://example.com/", {
      apiKey: "k",
      fetchFn: async (input: string | URL) => {
        const strategy = new URL(String(input)).searchParams.get("strategy");
        return psiOkResponse(samplePsiJson({ perfScore: strategy === "desktop" ? 0.98 : 0.72 }));
      },
    });
    expect(analysis.mobile?.categories.performance).toBe(0.72);
    expect(analysis.desktop?.categories.performance).toBe(0.98);
  });

  it("builds a request URL carrying the key server-side only", () => {
    const url = buildPageSpeedRequestUrl("https://example.com/", "k", "mobile");
    expect(url).toContain("strategy=mobile");
    expect(url).toContain("key=k");
  });
});

describe("pagespeed failure handling", () => {
  it("mobile failure keeps desktop assessed (and vice versa)", async () => {
    const mobileFails = await fetchPageSpeedStrategies("https://example.com/", {
      apiKey: "k",
      fetchFn: async (input: string | URL) =>
        new URL(String(input)).searchParams.get("strategy") === "mobile"
          ? new Response("boom", { status: 500 })
          : psiOkResponse(samplePsiJson()),
    });
    expect(mobileFails.mobile).toBeNull();
    expect(mobileFails.mobileReason).toBe("PageSpeed request failed");
    expect(mobileFails.desktop).not.toBeNull();
    expect(hasPageSpeedEvidence(mobileFails)).toBe(true);
    // Desktop alone still assesses the rule, named as the fallback strategy.
    const findings = runChecks({ ...baseInput(), psi: mobileFails });
    const lab = findings.find((f) => f.ruleId === "performance-lab");
    expect(lab?.status).toBe("PASS");
    expect(lab?.summary).toContain("desktop");
  });

  it("both failures degrade gracefully without crashing", async () => {
    const analysis = await fetchPageSpeedStrategies("https://example.com/", {
      apiKey: "k",
      fetchFn: async () => new Response("quota", { status: 429 }),
    });
    expect(analysis.mobile).toBeNull();
    expect(analysis.desktop).toBeNull();
    expect(hasPageSpeedEvidence(analysis)).toBe(false);
  });

  it("timeout produces NOT_ASSESSED", async () => {
    const hanging = async () => {
      await new Promise<never>((_, reject) => {
        setTimeout(() => reject(new DOMException("aborted", "TimeoutError")), 5);
      });
      throw new Error("unreachable");
    };
    const analysis = await fetchPageSpeedStrategies("https://example.com/", {
      apiKey: "k",
      fetchFn: hanging,
      timeoutMs: 10,
    });
    expect(hasPageSpeedEvidence(analysis)).toBe(false);
    const findings = runChecks({ ...baseInput(), psi: analysis, psiReason: "PageSpeed request failed" });
    expect(findings.find((f) => f.ruleId === "performance-lab")?.status).toBe("NOT_ASSESSED");
  });
});

describe("audit integration", () => {
  function htmlFetch() {
    return (async (input: string | URL | Request) => {
      const url = new URL(String(input));
      if (url.pathname !== "/") {
        return mockResponse("not found", { status: 404, contentType: "text/plain" });
      }
      return htmlResponse(
        `<!DOCTYPE html><html lang="en"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Example Business Provides Quality Services Online</title>
<meta name="description" content="A well written meta description that falls inside the recommended length band.">
<link rel="canonical" href="https://example.com/">
</head><body><h1>Welcome</h1><p>${"Copy about services. ".repeat(30)}</p></body></html>`,
      );
    }) as typeof fetch;
  }

  it("performance-lab receives real evidence when available", () => {
    const findings = runChecks({ ...baseInput(), psi: analysisFixture() });
    expect(findings.find((f) => f.ruleId === "performance-lab")?.status).toBe("PASS");
  });

  it("performance-lab stays NOT_ASSESSED when evidence is unavailable", () => {
    const findings = runChecks(baseInput());
    expect(findings.find((f) => f.ruleId === "performance-lab")?.status).toBe("NOT_ASSESSED");
  });

  it("INP is reported as lab-unavailable, never derived from TBT", () => {
    const findings = runChecks({ ...baseInput(), psi: analysisFixture() });
    const lab = findings.find((f) => f.ruleId === "performance-lab");
    const dump = JSON.stringify(lab?.evidence);
    expect(dump).toContain(INP_LAB_UNAVAILABLE_NOTE);
    // TBT evidence carries its real value; the INP entry stays null.
    expect(dump).toContain('"metric":"total-blocking-time"');
    const inpEntry = lab?.evidence.find(
      (e) => typeof e.value === "object" && e.value !== null && (e.value as Record<string, unknown>).metric === "interaction-to-next-paint",
    );
    expect((inpEntry?.value as Record<string, unknown>).value).toBeNull();
  });

  it("coverage increases only when the check becomes assessable", async () => {
    mockPublicDns();
    const without = await runAudit("https://example.com/", {
      fetchFn: htmlFetch(),
      now: () => NOW,
      skipPagespeed: true,
    });
    const assessedBefore = without.summary.assessed;
    const psiFetch = async () => psiOkResponse(samplePsiJson());
    const withPsi = await runAudit("https://example.com/", {
      fetchFn: htmlFetch(),
      now: () => NOW,
      pagespeedApiKey: "test-key",
      pagespeedFetchFn: psiFetch,
    });
    expect(withPsi.summary.assessed).toBe(assessedBefore + 1);
    expect(withPsi.findings).toHaveLength(37);
    expect(withPsi.findings.find((f) => f.ruleId === "performance-lab")?.status).toBe("PASS");
    expect(withPsi.psi?.mobile).not.toBeNull();
    expect(withPsi.psi?.desktop).not.toBeNull();
  });

  it("non-Lighthouse rules remain unchanged with PSI enabled", async () => {
    mockPublicDns();
    const psiFetch = async () => psiOkResponse(samplePsiJson());
    const result = await runAudit("https://example.com/", {
      fetchFn: htmlFetch(),
      now: () => NOW,
      pagespeedApiKey: "test-key",
      pagespeedFetchFn: psiFetch,
    });
    const byId = new Map(result.findings.map((f) => [f.ruleId, f.status]));
    expect(byId.get("https")).toBe("PASS");
    expect(byId.get("performance-field")).toBe("NOT_ASSESSED");
    expect(byId.get("gsc-indexing")).toBe("NOT_ASSESSED");
    expect(byId.get("backlinks")).toBe("NOT_ASSESSED");
  });

  it("uses the audit final URL for both PageSpeed requests", async () => {
    mockPublicDns();
    const seen: string[] = [];
    const result = await runAudit("https://example.com/", {
      fetchFn: htmlFetch(),
      now: () => NOW,
      pagespeedApiKey: "test-key",
      pagespeedFetchFn: async (input) => {
        seen.push(String(input));
        return psiOkResponse(samplePsiJson());
      },
    });
    expect(seen).toHaveLength(2);
    for (const s of seen) {
      expect(new URL(s).searchParams.get("url")).toBe(result.site.finalUrl);
    }
  });
});

describe("report", () => {
  function auditWithPsi(): Parameters<typeof renderTechnicalPdf>[0] {
    const psi = analysisFixture();
    const findings = runChecks({ ...baseInput(), psi });
    return {
      id: "psi-pdf",
      version: "1",
      engineVersion: "1.0.0",
      ruleSetVersion: "37-step-v1",
      generatedAt: NOW,
      site: { submittedUrl: "https://example.com", finalUrl: "https://example.com/", domain: "example.com" },
      crawl: {
        submittedUrl: "https://example.com", finalUrl: "https://example.com/", domain: "example.com",
        redirects: [], pagesRequested: 1, pagesAnalysed: 1, analysedUrls: ["https://example.com/"],
      },
      robots: {
        url: "https://example.com/robots.txt", status: 200, contentType: "text/plain",
        body: "User-agent: *\nAllow: /", sitemapRefs: [], disallowRules: [], llmsTxtDetected: false,
      },
      sitemap: {
        url: null, status: null, contentType: null, validXml: false, kind: "unknown" as const,
        discoveredUrls: [], invalidEntries: 0, duplicateUrls: 0, offOriginUrls: 0,
      },
      psi,
      summary: { score: 80, provisional: false, coverage: 0.8, passed: 1, warnings: 0, failed: 0, notAssessed: 0, assessed: 1, applicable: 1 },
      quadrants: [],
      findings,
    };
  }

  it("technical report includes Lighthouse evidence when available", () => {
    const buf = renderTechnicalPdf(auditWithPsi());
    expect(buf.subarray(0, 4).toString()).toBe("%PDF");
    expect(buf.length).toBeGreaterThan(8000);
  });

  it("no evidence is fabricated when unavailable", () => {
    const findings = runChecks(baseInput());
    const lab = findings.find((f) => f.ruleId === "performance-lab");
    expect(lab?.status).toBe("NOT_ASSESSED");
    const values = (lab?.evidence ?? []).map((e) => e.value);
    expect(JSON.stringify(values)).not.toContain("2100");
  });

  it("API key never appears in report content", () => {
    const audit = auditWithPsi();
    const buf = renderTechnicalPdf(audit);
    expect(buf.toString("latin1")).not.toContain("super-secret-key");
    expect(JSON.stringify(audit)).not.toContain("PAGESPEED_API_KEY");
  });
});
