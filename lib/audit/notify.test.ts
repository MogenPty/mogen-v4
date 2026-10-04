import { describe, expect, it } from "vitest";
import { FakeMailProvider } from "@/lib/mail/fake-mail-provider";
import {
  getAuditMailConfig,
  sendClientReportEmail,
  sendInternalAuditEmail,
} from "./notify";
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
    id: "notify-test",
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

describe("audit notifications", () => {
  it("reads the inbox from SEO_REPORT_TO with fallback", () => {
    expect(getAuditMailConfig({ ...process.env, SEO_REPORT_TO: "seo@mogen.co.za" }).inbox).toBe(
      "seo@mogen.co.za",
    );
    expect(getAuditMailConfig({ ...process.env, SEO_REPORT_TO: undefined, MAIL_TO: undefined }).inbox).toBe(
      "info@mogen.co.za",
    );
  });

  it("sends the internal email with domain, IP and technical PDF", async () => {
    const provider = new FakeMailProvider();
    const result = await sendInternalAuditEmail(
      provider,
      { from: "Mogen <info@mogen.co.za>", inbox: "seo@mogen.co.za" },
      { audit: sampleAudit(), ip: "203.0.113.7" },
    );
    expect(result.success).toBe(true);
    expect(provider.sent).toHaveLength(1);
    const message = provider.sent[0];
    expect(message.to).toBe("seo@mogen.co.za");
    expect(message.subject).toContain("example.co.za");
    expect(message.text).toContain("203.0.113.7");
    expect(message.attachments).toHaveLength(1);
    expect(message.attachments?.[0].filename).toContain("mogen-technical-audit-example.co.za");
    expect(message.attachments?.[0].contentType).toBe("application/pdf");
  });

  it("includes lead details on form completion", async () => {
    const provider = new FakeMailProvider();
    await sendInternalAuditEmail(
      provider,
      { from: "Mogen <info@mogen.co.za>", inbox: "seo@mogen.co.za" },
      {
        audit: sampleAudit(),
        ip: "203.0.113.7",
        lead: { name: "Jane Doe", email: "jane@example.co.za", service: "SEO" },
      },
    );
    const message = provider.sent[0];
    expect(message.text).toContain("Jane Doe");
    expect(message.text).toContain("jane@example.co.za");
    expect(message.replyTo).toBe("jane@example.co.za");
  });

  it("sends the client email with the simplified PDF", async () => {
    const provider = new FakeMailProvider();
    const result = await sendClientReportEmail(
      provider,
      { from: "Mogen <info@mogen.co.za>", inbox: "seo@mogen.co.za" },
      { audit: sampleAudit(), to: "jane@example.co.za", name: "Jane Doe" },
    );
    expect(result.success).toBe(true);
    const message = provider.sent[0];
    expect(message.to).toBe("jane@example.co.za");
    expect(message.attachments).toHaveLength(1);
    expect(message.attachments?.[0].filename).toContain("mogen-growth-report-example.co.za");
  });
});
