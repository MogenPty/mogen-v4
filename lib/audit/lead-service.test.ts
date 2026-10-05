import { describe, expect, it } from "vitest";
import { FakeMailProvider } from "@/lib/mail/fake-mail-provider";
import { processAuditLead } from "./lead-service";
import { runChecks, type AnalysisInput } from "./checks";
import { parsePage } from "./parser";
import { scoreFindings, scoreQuadrants } from "./scoring";
import type { AuditResult } from "./types";

function sampleAudit(): AuditResult {
  const page = parsePage(
    "https://example.co.za/",
    200,
    `<!DOCTYPE html><html lang="en"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Example Business Provides Quality Services Online</title>
<meta name="description" content="A well written meta description that falls inside the recommended length band for display.">
<link rel="canonical" href="https://example.co.za/">
</head><body><h1>Welcome</h1>
<p>${"Substantive marketing copy about the business and its services. ".repeat(30)}</p>
<a href="/about">About</a><a href="/contact">Contact</a><a href="/services">Services</a>
</body></html>`,
  );
  const input: AnalysisInput = {
    now: "2026-10-04T00:00:00.000Z",
    finalUrl: "https://example.co.za/",
    origin: "https://example.co.za",
    redirects: [],
    pages: [page],
    robots: {
      url: "https://example.co.za/robots.txt", status: 404, contentType: null,
      body: null, sitemapRefs: [], disallowRules: [], llmsTxtDetected: false,
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
  return {
    id: "lead-test",
    version: "1",
    engineVersion: "1.0.0",
    ruleSetVersion: "37-step-v1",
    generatedAt: "2026-10-04T00:00:00.000Z",
    site: { submittedUrl: "https://example.co.za", finalUrl: "https://example.co.za/", domain: "example.co.za" },
    crawl: {
      submittedUrl: "https://example.co.za", finalUrl: "https://example.co.za/", domain: "example.co.za",
      redirects: [], pagesRequested: 1, pagesAnalysed: 1, analysedUrls: ["https://example.co.za/"],
    },
    robots: { url: input.robots.url, status: 404, contentType: null, body: null, sitemapRefs: [], disallowRules: [], llmsTxtDetected: false },
    sitemap: { url: null, status: null, contentType: null, validXml: false, kind: "unknown", discoveredUrls: [], invalidEntries: 0, duplicateUrls: 0, offOriginUrls: 0 },
    summary: scoreFindings(findings),
    quadrants: scoreQuadrants(findings),
    findings,
  };
}

describe("lead processing", () => {
  it("sends both emails with server-computed numbers", async () => {
    const provider = new FakeMailProvider();
    const result = await processAuditLead(provider, {
      lead: { name: "Jane Doe", email: "jane@example.co.za", service: "seo" },
      audit: sampleAudit(),
      ip: "203.0.113.7",
    });
    expect(result).toEqual({ ok: true });
    expect(provider.sent).toHaveLength(2);
    const [internal, client] = provider.sent;
    // Internal first: domain, IP, lead, technical PDF.
    expect(internal.subject).toContain("example.co.za");
    expect(internal.text).toContain("203.0.113.7");
    expect(internal.text).toContain("Jane Doe");
    expect(internal.attachments?.[0].filename).toContain("mogen-technical-audit");
    // Client second: simplified PDF to the visitor.
    expect(client.to).toBe("jane@example.co.za");
    expect(client.attachments?.[0].filename).toContain("mogen-growth-report");
  });

  it("still sends the internal email when the client email fails", async () => {
    const provider = new FakeMailProvider();
    let calls = 0;
    const flaky = {
      ...provider,
      name: "flaky",
      sent: provider.sent,
      send: async (message: Parameters<FakeMailProvider["send"]>[0]) => {
        calls += 1;
        if (calls === 2) return { success: false as const, error: { code: "PROVIDER_ERROR" as const, message: "boom" } };
        return provider.send(message);
      },
    };
    const result = await processAuditLead(flaky, {
      lead: { name: "Jane Doe", email: "jane@example.co.za" },
      audit: sampleAudit(),
    });
    expect(result.ok).toBe(false);
    expect(provider.sent).toHaveLength(1);
    expect(provider.sent[0].subject).toContain("example.co.za");
  });
});
