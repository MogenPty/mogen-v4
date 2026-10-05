import "server-only";

import { NextResponse } from "next/server";
import { z } from "zod";
import { getAudit } from "@/lib/audit/audit-store";
import { processAuditLead } from "@/lib/audit/lead-service";
import { getMailProvider } from "@/lib/mail/provider-factory";
import {
  parseExpectedHostnames,
  verifyTurnstileToken,
} from "@/lib/turnstile/verify";

/**
 * POST /api/audit/lead — visitor completed the audit lead form.
 *
 * Body: { lead: { name, email, phone?, business?, service? }, auditId: string }
 *
 * The audit is retrieved from short-lived server storage by server-issued
 * ID — caller-submitted findings are never trusted, so fabricated evidence
 * cannot reach the emailed PDFs. Sends the simplified PDF to the visitor and
 * the full technical PDF (with lead details) to Mogen's inbox.
 */

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
  auditId: z.string().min(1).max(200),
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

  const parsed = bodySchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json(
      { ok: false, error: "Please check the highlighted fields." },
      { status: 400 },
    );
  }
  const { lead, auditId, turnstileToken } = parsed.data;

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

  const audit = getAudit(auditId);
  if (!audit) {
    return NextResponse.json(
      { ok: false, error: "Your scan has expired. Please run the scan again." },
      { status: 410 },
    );
  }

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

  const result = await processAuditLead(provider, {
    lead: {
      name: lead.name,
      email: lead.email,
      ...(lead.phone ? { phone: lead.phone } : {}),
      ...(lead.business ? { business: lead.business } : {}),
      ...(lead.service ? { service: lead.service } : {}),
    },
    audit,
    ...(ip === "unknown" ? {} : { ip }),
  });
  if (!result.ok) {
    return NextResponse.json({ ok: false, error: result.error }, { status: result.status });
  }
  return NextResponse.json({ ok: true });
}
