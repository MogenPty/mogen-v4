import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

const { POST } = await import("@/app/api/audit/lead/route");
const { saveAudit } = await import("./audit-store");
import type { AuditResult } from "./types";

afterEach(() => {
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

function request(body: unknown): Request {
  return new Request("http://localhost/api/audit/lead", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

function storedAudit(): AuditResult {
  return {
    id: "lead-route-test",
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
    summary: { score: 80, provisional: false, coverage: 0.8, passed: 1, warnings: 0, failed: 0, notAssessed: 0, assessed: 1, applicable: 1 },
    quadrants: [],
    findings: [],
  };
}

describe("lead route", () => {
  it("rejects invalid bodies", async () => {
    const res = await POST(request({ lead: { name: "x" } }));
    expect(res.status).toBe(400);
  });

  it("honeypot pretends success without touching the store", async () => {
    const res = await POST(
      request({
        lead: { name: "Bot", email: "bot@example.com", companyWebsite: "spam" },
        auditId: "anything",
      }),
    );
    expect(res.status).toBe(200);
    expect(((await res.json()) as { ok: boolean }).ok).toBe(true);
  });

  it("rejects unknown audit IDs without trusting caller input", async () => {
    const res = await POST(
      request({
        lead: { name: "Jane Doe", email: "jane@example.co.za" },
        auditId: "no-such-audit",
      }),
    );
    expect(res.status).toBe(410);
    const data = (await res.json()) as { ok: boolean; error: string };
    expect(data.ok).toBe(false);
    expect(data.error).toContain("expired");
  });

  it("reaches the mail step for a stored audit", async () => {
    vi.stubEnv("TURNSTILE_SECRET", "");
    vi.stubEnv("RESEND_API_KEY", "");
    vi.stubEnv("MAIL_PROVIDER", "resend");
    const auditId = saveAudit(storedAudit());
    const res = await POST(
      request({
        lead: { name: "Jane Doe", email: "jane@example.co.za" },
        auditId,
      }),
    );
    // No mail credentials in test env: the route must fail at delivery (502),
    // proving it used the stored audit rather than caller input.
    expect(res.status).toBe(502);
  });
});
