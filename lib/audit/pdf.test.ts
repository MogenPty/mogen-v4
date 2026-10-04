import { describe, expect, it } from "vitest";
import {
  clientPdfFilename,
  renderClientPdf,
  renderTechnicalPdf,
  technicalPdfFilename,
} from "./pdf";
import { runChecks, type AnalysisInput } from "./checks";
import { parsePage } from "./parser";
import { scoreFindings, scoreQuadrants } from "./scoring";
import type { AuditResult } from "./types";

function sampleAudit(score: number | null): AuditResult {
  const page = parsePage(
    "https://example.co.za/",
    200,
    `<!DOCTYPE html><html lang="en"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Example Business Provides Quality Services Online</title>
<meta name="description" content="A well written meta description that falls inside the recommended length band for display.">
<link rel="canonical" href="https://example.co.za/">
<meta property="og:title" content="Example"><meta property="og:description" content="Example">
<meta property="og:image" content="https://example.co.za/og.png">
<meta name="twitter:card" content="summary_large_image">
</head><body><h1>Welcome</h1>
<p>${"Substantive marketing copy about the business and its services. ".repeat(30)}</p>
<a href="/about">About</a><a href="/contact">Contact</a><a href="/services">Services</a>
<p>Phone 012 345 6789, email info@example.co.za.</p>
</body></html>`,
  );
  const input: AnalysisInput = {
    now: "2026-10-04T00:00:00.000Z",
    finalUrl: "https://example.co.za/",
    origin: "https://example.co.za",
    redirects: [],
    pages: [page],
    robots: {
      url: "https://example.co.za/robots.txt", status: 200, contentType: "text/plain",
      body: "User-agent: *\nAllow: /", sitemapRefs: [], disallowRules: [],
      llmsTxtDetected: false,
    },
    sitemap: {
      url: null, status: null, contentType: null, validXml: false, kind: "unknown",
      discoveredUrls: [], invalidEntries: 0, duplicateUrls: 0, offOriginUrls: 0,
    },
    canonicalTargets: new Map([
      ["https://example.co.za/", { ok: true, status: 200, sameOrigin: true, selfCanonical: true }],
    ]),
  };
  const findings = runChecks(input);
  const summary = scoreFindings(findings);
  return {
    id: "pdf-test",
    version: "1",
    engineVersion: "1.0.0",
    ruleSetVersion: "37-step-v1",
    generatedAt: "2026-10-04T00:00:00.000Z",
    site: { submittedUrl: "https://example.co.za", finalUrl: "https://example.co.za/", domain: "example.co.za" },
    crawl: {
      submittedUrl: "https://example.co.za", finalUrl: "https://example.co.za/", domain: "example.co.za",
      redirects: [], pagesRequested: 1, pagesAnalysed: 1, analysedUrls: ["https://example.co.za/"],
    },
    robots: { url: input.robots.url, status: 200, contentType: "text/plain", body: "User-agent: *\nAllow: /", sitemapRefs: [], disallowRules: [], llmsTxtDetected: false },
    sitemap: { url: null, status: null, contentType: null, validXml: false, kind: "unknown", discoveredUrls: [], invalidEntries: 0, duplicateUrls: 0, offOriginUrls: 0 },
    summary: { ...summary, score },
    quadrants: scoreQuadrants(findings),
    findings,
  };
}

describe("PDF rendering", () => {
  it("renders a client PDF with a good score", () => {
    const buf = renderClientPdf(sampleAudit(85));
    expect(buf.subarray(0, 4).toString()).toBe("%PDF");
    expect(buf.length).toBeGreaterThan(3000);
  });

  it("renders a client PDF with a poor score (score omitted, strengths kept)", () => {
    const buf = renderClientPdf(sampleAudit(42));
    expect(buf.subarray(0, 4).toString()).toBe("%PDF");
    expect(buf.length).toBeGreaterThan(3000);
  });

  it("renders the full technical PDF", () => {
    const buf = renderTechnicalPdf(sampleAudit(85), {
      ip: "203.0.113.7",
      lead: { name: "Test User", email: "test@example.co.za" },
    });
    expect(buf.subarray(0, 4).toString()).toBe("%PDF");
    expect(buf.length).toBeGreaterThan(8000);
  });

  it("builds safe filenames", () => {
    expect(clientPdfFilename("Example.CO.ZA")).toBe("mogen-growth-report-example.co.za.pdf");
    expect(technicalPdfFilename("example.co.za", new Date("2026-10-04T00:00:00.000Z"))).toBe(
      "mogen-technical-audit-example.co.za-2026-10-04.pdf",
    );
  });
});
