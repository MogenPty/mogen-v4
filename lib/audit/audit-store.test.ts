import { describe, expect, it, vi } from "vitest";
import { getAudit, saveAudit } from "./audit-store";
import type { AuditResult } from "./types";

function minimalAudit(): AuditResult {
  return {
    id: "store-test",
    version: "1",
    engineVersion: "1.0.0",
    ruleSetVersion: "37-step-v1",
    generatedAt: new Date().toISOString(),
    site: { submittedUrl: "https://example.co.za", finalUrl: "https://example.co.za/", domain: "example.co.za" },
    crawl: {
      submittedUrl: "https://example.co.za", finalUrl: "https://example.co.za/", domain: "example.co.za",
      redirects: [], pagesRequested: 1, pagesAnalysed: 1, analysedUrls: ["https://example.co.za/"],
    },
    robots: { url: "", status: null, contentType: null, body: null, sitemapRefs: [], disallowRules: [], llmsTxtDetected: false },
    sitemap: { url: null, status: null, contentType: null, validXml: false, kind: "unknown", discoveredUrls: [], invalidEntries: 0, duplicateUrls: 0, offOriginUrls: 0 },
    summary: { score: 80, provisional: false, coverage: 0.8, passed: 1, warnings: 0, failed: 0, notAssessed: 0, assessed: 1, applicable: 1 },
    quadrants: [],
    findings: [],
  };
}

describe("audit store", () => {
  it("round-trips a saved audit by ID", () => {
    const audit = minimalAudit();
    const id = saveAudit(audit);
    expect(typeof id).toBe("string");
    expect(getAudit(id)).toBe(audit);
  });

  it("returns null for unknown IDs", () => {
    expect(getAudit("no-such-id")).toBeNull();
  });

  it("expires entries after the TTL", () => {
    vi.useFakeTimers();
    try {
      const id = saveAudit(minimalAudit());
      expect(getAudit(id)).not.toBeNull();
      vi.advanceTimersByTime(31 * 60 * 1000);
      expect(getAudit(id)).toBeNull();
    } finally {
      vi.useRealTimers();
    }
  });
});
