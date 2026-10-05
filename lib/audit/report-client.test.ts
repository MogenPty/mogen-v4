import { describe, expect, it } from "vitest";
import {
  buildClientReport,
  GOOD_SCORE_THRESHOLD,
} from "./report-client";
import type { AuditResult, Finding } from "./types";

function finding(ruleId: string, status: Finding["status"]): Finding {
  return {
    ruleId,
    status,
    summary: `${ruleId} ${status}`,
    evidence:
      status === "PASS" || status === "FAIL" || status === "WARN"
        ? [{ source: "html", observedAt: "2026-10-04T00:00:00.000Z", value: 1 }]
        : [],
  };
}

function auditWith(score: number | null, statuses: Finding["status"][]): AuditResult {
  const ruleIds = [
    "https", "title-present", "h1", "images-alt", "og-tags",
    "backlinks", "rankings", "performance-lab",
  ];
  const findings = ruleIds.map((ruleId, i) => finding(ruleId, statuses[i] ?? "NOT_ASSESSED"));
  return {
    id: "test",
    version: "1",
    engineVersion: "1.0.0",
    ruleSetVersion: "37-step-v1",
    generatedAt: "2026-10-04T00:00:00.000Z",
    site: { submittedUrl: "https://example.co.za", finalUrl: "https://example.co.za/", domain: "example.co.za" },
    crawl: {
      submittedUrl: "https://example.co.za", finalUrl: "https://example.co.za/", domain: "example.co.za",
      redirects: [], pagesRequested: 1, pagesAnalysed: 1, analysedUrls: ["https://example.co.za/"],
    },
    robots: { url: "", status: null, contentType: null, body: null, sitemapRefs: [], disallowRules: [], llmsTxtDetected: false },
    sitemap: { url: null, status: null, contentType: null, validXml: false, kind: "unknown", discoveredUrls: [], invalidEntries: 0, duplicateUrls: 0, offOriginUrls: 0 },
    summary: {
      score, provisional: false, coverage: 0.8,
      passed: 0, warnings: 0, failed: 0, notAssessed: 0, assessed: 4, applicable: 5,
    },
    quadrants: [],
    findings,
  };
}

describe("client report model", () => {
  it("shows a good score and only passing strengths", () => {
    const model = buildClientReport(
      auditWith(85, ["PASS", "PASS", "FAIL", "WARN", "PASS", "NOT_ASSESSED", "NOT_ASSESSED", "NOT_ASSESSED"]),
    );
    expect(GOOD_SCORE_THRESHOLD).toBe(70);
    expect(model.scoreShown).toBe(true);
    expect(model.score).toBe(85);
    const ids = model.strengths.map((s) => s.ruleId);
    expect(ids).toContain("https");
    expect(ids).toContain("title-present");
    expect(ids).toContain("og-tags");
    expect(ids).not.toContain("h1");
    expect(ids).not.toContain("images-alt");
    expect(ids).not.toContain("backlinks");
  });

  it("omits a poor score entirely", () => {
    const model = buildClientReport(
      auditWith(42, ["PASS", "PASS", "PASS", "PASS", "PASS", "NOT_ASSESSED", "NOT_ASSESSED", "NOT_ASSESSED"]),
    );
    expect(model.score).toBe(42);
    expect(model.scoreShown).toBe(false);
    expect(model.strengths.length).toBeGreaterThan(0);
  });

  it("omits a missing score entirely", () => {
    const model = buildClientReport(
      auditWith(null, ["PASS", "NOT_ASSESSED", "NOT_ASSESSED", "NOT_ASSESSED", "NOT_ASSESSED", "NOT_ASSESSED", "NOT_ASSESSED", "NOT_ASSESSED"]),
    );
    expect(model.scoreShown).toBe(false);
  });
});
