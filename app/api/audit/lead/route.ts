import "server-only";

import { NextResponse } from "next/server";
import { z } from "zod";
import { getService } from "@/data/services";
import { scoreFindings } from "@/lib/audit/scoring";
import { getMailProvider } from "@/lib/mail/provider-factory";
import {
  getAuditMailConfig,
  sendClientReportEmail,
  sendInternalAuditEmail,
  type LeadInfo,
} from "@/lib/audit/notify";
import type { AuditResult, Finding, FindingStatus } from "@/lib/audit/types";
import {
  parseExpectedHostnames,
  verifyTurnstileToken,
} from "@/lib/turnstile/verify";

/**
 * POST /api/audit/lead — visitor completed the audit lead form.
 *
 * Body: { lead: { name, email, phone?, business?, service? }, audit: AuditResult }
 *
 * The client re-submits the audit it received; the server re-validates its
 * shape and recomputes the score from the findings so emailed numbers
 * cannot be tampered with. Sends the simplified PDF to the visitor and the
 * full technical PDF (with lead details) to Mogen's inbox.
 */

const STATUSES: FindingStatus[] = [
  "PASS", "FAIL", "WARN", "NOT_ASSESSED", "NOT_APPLICABLE", "HISTORICAL", "INFERRED",
];

const evidenceSchema = z.object({
  source: z.string(),
  observedAt: z.string(),
  url: z.string().optional(),
  value: z.unknown().optional(),
  expected: z.unknown().optional(),
  details: z.string().optional(),
});

const findingSchema = z.object({
  ruleId: z.string().min(1).max(80),
  status: z.enum(STATUSES as [FindingStatus, ...FindingStatus[]]),
  summary: z.string().max(2000),
  evidence: z.array(evidenceSchema).max(50),
  recommendation: z.string().max(2000).optional(),
});

const auditSchema = z.object({
  id: z.string().max(100),
  version: z.string().max(20),
  engineVersion: z.string().max(20),
  ruleSetVersion: z.string().max(40),
  generatedAt: z.string().max(40),
  site: z.object({
    submittedUrl: z.string().max(2048),
    finalUrl: z.string().max(2048),
    domain: z.string().max(253),
  }),
  crawl: z.object({
    submittedUrl: z.string().max(2048),
    finalUrl: z.string().max(2048),
    domain: z.string().max(253),
    redirects: z.array(z.object({ url: z.string().max(2048), status: z.number() })).max(10),
    pagesRequested: z.number(),
    pagesAnalysed: z.number(),
    analysedUrls: z.array(z.string().max(2048)).max(20),
  }),
  robots: z.object({
    url: z.string().max(2048),
    status: z.number().nullable(),
    contentType: z.string().max(200).nullable(),
    body: z.string().max(20000).nullable(),
    sitemapRefs: z.array(z.string().max(500)).max(10),
    disallowRules: z.array(z.string().max(200)).max(50),
    llmsTxtDetected: z.boolean(),
  }),
  sitemap: z.object({
    url: z.string().max(2048).nullable(),
    status: z.number().nullable(),
    contentType: z.string().max(200).nullable(),
    validXml: z.boolean(),
    kind: z.enum(["urlset", "sitemapindex", "unknown"]),
    discoveredUrls: z.array(z.string().max(2048)).max(300),
    invalidEntries: z.number(),
    duplicateUrls: z.number(),
    offOriginUrls: z.number(),
  }),
  summary: z.object({
    score: z.number().nullable(),
    provisional: z.boolean(),
    coverage: z.number(),
    passed: z.number(),
    warnings: z.number(),
    failed: z.number(),
    notAssessed: z.number(),
    assessed: z.number(),
    applicable: z.number(),
  }),
  quadrants: z.array(z.object({
    id: z.string(),
    label: z.string(),
    score: z.number().nullable(),
    coverage: z.number(),
    assessed: z.number(),
    applicable: z.number(),
  })).max(10),
  findings: z.array(findingSchema).min(1).max(100),
});

const leadSchema = z.object({
  name: z.string().trim().min(2).max(120),
  email: z.string().trim().email().max(254),
  phone: z.string().trim().max(40).optional().default(""),
  business: z.string().trim().max(160).optional().default(""),
  service: z.string().trim().max(80).optional().default(""),
  companyWebsite: z.string().max(200).optional().default(""),
});

const bodySchema = z.object({
  lead: leadSchema,
  audit: auditSchema,
  turnstileToken: z.unknown().optional(),
});

const hits = new Map<string, number[]>();
const WINDOW_MS = 10 * 60 * 1000;
const MAX_HITS = 5;
const MAX_TRACKED_IPS = 5000;
let lastCleanup = 0;

function isRateLimited(ip: string): boolean {
  const now = Date.now();
  if (now - lastCleanup >= WINDOW_MS) {
    lastCleanup = now;
    for (const [key, timestamps] of hits) {
      const active = timestamps.filter((t) => now - t < WINDOW_MS);
      if (active.length === 0) hits.delete(key);
      else hits.set(key, active);
    }
  }
  const active = (hits.get(ip) ?? []).filter((t) => now - t < WINDOW_MS);
  if (active.length >= MAX_HITS) return true;
  active.push(now);
  hits.set(ip, active);
  while (hits.size > MAX_TRACKED_IPS) {
    const oldest = hits.keys().next();
    if (oldest.done) break;
    hits.delete(oldest.value);
  }
  return false;
}

export async function POST(req: Request) {
  const ip =
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  if (isRateLimited(ip)) {
    return NextResponse.json(
      { ok: false, error: "Too many requests. Please try again later." },
      { status: 429 },
    );
  }

  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid request." }, { status: 400 });
  }
  // Bound re-submitted audit payloads (the analyser caps pages at 10 and
  // evidence is truncated, so legitimate payloads are far below this).
  if (JSON.stringify(raw ?? {}).length > 2 * 1024 * 1024) {
    return NextResponse.json({ ok: false, error: "Invalid request." }, { status: 400 });
  }

  const parsed = bodySchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json(
      { ok: false, error: "Please check the highlighted fields." },
      { status: 400 },
    );
  }
  const { lead, audit, turnstileToken } = parsed.data;

  // Honeypot — pretend success so bots learn nothing.
  if (lead.companyWebsite) return NextResponse.json({ ok: true });

  // Turnstile gate — enforced only when the server is configured for it.
  if (process.env.TURNSTILE_SECRET) {
    const verification = await verifyTurnstileToken({
      token: turnstileToken,
      remoteip: ip === "unknown" ? undefined : ip,
      secret: process.env.TURNSTILE_SECRET,
      expectedAction: "audit-lead",
      expectedHostnames: parseExpectedHostnames(process.env.TURNSTILE_HOSTNAMES),
    });
    if (!verification.ok) {
      console.error(`[audit-lead] turnstile rejected: ${verification.reason}`);
      return NextResponse.json(
        {
          ok: false,
          error: "Verification failed. Please complete the check and try again.",
          turnstile: true,
        },
        { status: 403 },
      );
    }
  }

  // Recompute the score from the submitted findings — emailed numbers always
  // come from the server, never from client-provided totals.
  const trustedSummary = scoreFindings(audit.findings as Finding[]);
  const trustedAudit: AuditResult = {
    ...(audit as AuditResult),
    summary: { ...trustedSummary, score: trustedSummary.score },
  };

  let provider;
  try {
    provider = getMailProvider();
  } catch {
    console.error("[audit-lead] provider config error");
    return NextResponse.json(
      { ok: false, error: "Something went wrong. Please try again or email info@mogen.co.za." },
      { status: 500 },
    );
  }
  const config = getAuditMailConfig();
  if (!config.inbox || !config.from) {
    console.error("[audit-lead] mail recipient/sender is not configured");
    return NextResponse.json(
      { ok: false, error: "Something went wrong. Please try again or email info@mogen.co.za." },
      { status: 500 },
    );
  }

  const serviceName = getService(lead.service)?.name ?? lead.service;
  const leadInfo: LeadInfo = {
    name: lead.name,
    email: lead.email,
    ...(lead.phone ? { phone: lead.phone } : {}),
    ...(lead.business ? { business: lead.business } : {}),
    ...(serviceName ? { service: serviceName } : {}),
  };

  const clientResult = await sendClientReportEmail(provider, config, {
    audit: trustedAudit,
    to: lead.email,
    name: lead.name,
  });
  if (!clientResult.success) {
    console.error(`[audit-lead] client mail failed: ${clientResult.error.code}`);
    return NextResponse.json(
      { ok: false, error: "Something went wrong sending your report. Please try again or email info@mogen.co.za." },
      { status: 502 },
    );
  }

  const internalResult = await sendInternalAuditEmail(provider, config, {
    audit: trustedAudit,
    ip: ip === "unknown" ? undefined : ip,
    lead: leadInfo,
  });
  if (!internalResult.success) {
    console.error(`[audit-lead] internal mail failed: ${internalResult.error.code}`);
  }

  return NextResponse.json({ ok: true });
}
