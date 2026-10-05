import { describe, expect, it } from "vitest";
import { isValidLangTag, runChecks, type AnalysisInput } from "./checks";
import { parsePage } from "./parser";
import {
  findingsMissingEvidence,
  scoreFindings,
} from "./scoring";
import type { Finding } from "./types";

const NOW = "2026-10-04T00:00:00.000Z";

function ev() {
  return { source: "html" as const, observedAt: NOW, value: 1 };
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
<meta property="og:title" content="Example"><meta property="og:description" content="Example">
<meta property="og:image" content="https://example.com/og.png">
<meta name="twitter:card" content="summary_large_image">
<script type="application/ld+json">{"@context":"https://schema.org","@type":"Organization","name":"Example"}</script>
</head><body><h1>Welcome</h1><h2>Services</h2>
<p>${"Substantive marketing copy about the business and its services. ".repeat(30)}</p>
<img src="/a.jpg" alt="Team" width="100" height="100">
<a href="/about">About</a><a href="/contact">Contact</a><a href="/services">Services</a>
<p>Phone 012 345 6789, email info@example.com, 123 Main Road, Pretoria.</p>
</body></html>`,
  );
  return {
    now: NOW,
    finalUrl: "https://example.com/",
    origin: "https://example.com",
    redirects: [],
    pages: [page],
    robots: {
      url: "https://example.com/robots.txt",
      status: 200,
      contentType: "text/plain",
      body: "User-agent: *\nAllow: /\nSitemap: https://example.com/sitemap.xml",
      sitemapRefs: ["https://example.com/sitemap.xml"],
      disallowRules: [],
      llmsTxtDetected: false,
    },
    sitemap: {
      url: "https://example.com/sitemap.xml",
      status: 200,
      contentType: "application/xml",
      validXml: true,
      kind: "urlset",
      discoveredUrls: ["https://example.com/"],
      invalidEntries: 0,
      duplicateUrls: 0,
      offOriginUrls: 0,
    },
    canonicalTargets: new Map([
      ["https://example.com/", { ok: true, status: 200, sameOrigin: true, selfCanonical: true }],
    ]),
  };
}

describe("scoring model", () => {
  it("excludes NOT_ASSESSED from numerator and denominator", () => {
    const withUnassessed: Finding[] = [
      { ruleId: "https", status: "PASS", summary: "ok", evidence: [ev()] },
      { ruleId: "backlinks", status: "NOT_ASSESSED", summary: "no data", evidence: [] },
      { ruleId: "rankings", status: "NOT_ASSESSED", summary: "no data", evidence: [] },
    ];
    const withoutUnassessed: Finding[] = [
      { ruleId: "https", status: "PASS", summary: "ok", evidence: [ev()] },
    ];
    const a = scoreFindings(withUnassessed);
    const b = scoreFindings(withoutUnassessed);
    expect(a.score).toBe(b.score);
    expect(a.score).toBe(100);
    expect(a.notAssessed).toBe(2);
  });

  it("ignores INFERRED and HISTORICAL findings", () => {
    const findings: Finding[] = [
      { ruleId: "https", status: "FAIL", summary: "bad", evidence: [ev()] },
      { ruleId: "title-present", status: "PASS", summary: "inferred", evidence: [] },
    ];
    const inferred = findings.map((f) =>
      f.ruleId === "title-present" ? { ...f, status: "INFERRED" as const } : f,
    );
    const historical = findings.map((f) =>
      f.ruleId === "title-present" ? { ...f, status: "HISTORICAL" as const } : f,
    );
    expect(scoreFindings(inferred).score).toBe(scoreFindings(historical).score);
    expect(scoreFindings(inferred).score).toBe(0);
  });

  it("is deterministic for identical evidence", () => {
    const a = scoreFindings([
      { ruleId: "https", status: "PASS", summary: "ok", evidence: [ev()] },
      { ruleId: "title-present", status: "WARN", summary: "meh", evidence: [ev()] },
      { ruleId: "h1", status: "FAIL", summary: "bad", evidence: [ev()] },
    ]);
    const b = scoreFindings([
      { ruleId: "https", status: "PASS", summary: "ok", evidence: [ev()] },
      { ruleId: "title-present", status: "WARN", summary: "meh", evidence: [ev()] },
      { ruleId: "h1", status: "FAIL", summary: "bad", evidence: [ev()] },
    ]);
    expect(a).toEqual(b);
  });

  it("marks low-coverage scores as provisional", () => {
    const summary = scoreFindings([
      { ruleId: "https", status: "PASS", summary: "ok", evidence: [ev()] },
      ...["backlinks", "rankings", "gsc-indexing", "performance-lab", "performance-field"].map(
        (ruleId): Finding => ({ ruleId, status: "NOT_ASSESSED", summary: "no data", evidence: [] }),
      ),
    ]);
    expect(summary.provisional).toBe(true);
    expect(summary.coverage).toBeLessThan(0.5);
  });
});

describe("language tags", () => {
  it("accepts BCP 47 shapes and rejects the rest", () => {
    for (const tag of ["en", "EN", "deu", "pt-BR", "zh-Hans", "zh-Hans-CN", "es-419", "sr-Latn-RS"]) {
      expect(isValidLangTag(tag)).toBe(true);
    }
    for (const tag of ["", "e", "english", "en-", "en--US", "en-USA", "123", "en-4199"]) {
      expect(isValidLangTag(tag)).toBe(false);
    }
  });
});

describe("checks", () => {
  it("fails invalid JSON-LD syntax", () => {
    const input = baseInput();
    input.pages = [
      parsePage(
        "https://example.com/",
        200,
        '<html><head><script type="application/ld+json">{broken</script></head><body><h1>x</h1></body></html>',
      ),
    ];
    const findings = runChecks(input);
    expect(findings.find((f) => f.ruleId === "jsonld-syntax")?.status).toBe("FAIL");
  });

  it("never fabricates performance, authority, or Google data", () => {
    const findings = runChecks(baseInput());
    for (const ruleId of [
      "performance-lab", "performance-field", "gsc-indexing",
      "backlinks", "domain-authority", "rankings", "gbp-verified", "rich-results",
    ]) {
      expect(findings.find((f) => f.ruleId === ruleId)?.status).toBe("NOT_ASSESSED");
    }
  });

  it("produces all 37 findings with evidence behind every scored result", () => {
    const findings = runChecks(baseInput());
    expect(findings).toHaveLength(37);
    expect(findingsMissingEvidence(findings)).toEqual([]);
  });
});
