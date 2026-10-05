import "server-only";

import { NextResponse } from "next/server";
import { runAudit } from "@/lib/audit/audit";
import { saveAudit } from "@/lib/audit/audit-store";
import { safeErrorMessage } from "@/lib/audit/fetcher";
import {
  getAuditMailConfig,
  sendInternalAuditEmail,
} from "@/lib/audit/notify";
import { UrlValidationError, safeValidationMessage } from "@/lib/audit/url-validation";
import { getMailProvider } from "@/lib/mail/provider-factory";
import {
  parseExpectedHostnames,
  verifyTurnstileToken,
} from "@/lib/turnstile/verify";

/**
 * POST /api/audit — run a real SEO analysis of a submitted website.
 *
 * Body: { url: string, turnstileToken?: string }
 *
 * Abuse protection:
 * - 5 analyses / 10 min per IP (in-memory; a shared store would be needed
 *   for multi-instance quotas — same trade-off as /api/contact).
 * - Optional Cloudflare Turnstile: when TURNSTILE_SECRET is configured the
 *   token is verified server-side (action "audit"); when unconfigured the
 *   endpoint stays usable but rate-limited, so Turnstile can be enabled
 *   without redesigning the analyser.
 * - SSRF protection lives in lib/audit (URL validation, DNS/IP checks,
 *   redirect re-validation, response + crawl limits).
 */

const hits = new Map<string, number[]>();
const WINDOW_MS = 10 * 60 * 1000;
const MAX_HITS = 5;
const MAX_TRACKED_IPS = 5000;
let lastCleanup = 0;

function pruneExpiredHits(now: number): void {
  if (now - lastCleanup < WINDOW_MS) return;
  lastCleanup = now;
  for (const [ip, timestamps] of hits) {
    const active = timestamps.filter((t) => now - t < WINDOW_MS);
    if (active.length === 0) {
      hits.delete(ip);
    } else {
      hits.set(ip, active);
    }
  }
}

function isRateLimited(ip: string): boolean {
  const now = Date.now();
  pruneExpiredHits(now);
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

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { ok: false, error: "Invalid request." },
      { status: 400 },
    );
  }

  const url =
    typeof body === "object" && body !== null
      ? (body as Record<string, unknown>).url
      : undefined;
  if (typeof url !== "string" || url.trim() === "" || url.length > 2048) {
    return NextResponse.json(
      { ok: false, error: "Invalid website URL." },
      { status: 400 },
    );
  }

  // Turnstile gate — enforced only when the server is configured for it.
  if (process.env.TURNSTILE_SECRET) {
    const token =
      typeof body === "object" && body !== null
        ? (body as Record<string, unknown>).turnstileToken
        : undefined;
    const verification = await verifyTurnstileToken({
      token,
      remoteip: ip === "unknown" ? undefined : ip,
      secret: process.env.TURNSTILE_SECRET,
      expectedAction: "audit",
      expectedHostnames: parseExpectedHostnames(process.env.TURNSTILE_HOSTNAMES),
    });
    if (!verification.ok) {
      console.error(`[audit] turnstile rejected: ${verification.reason}`);
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

  try {
    const result = await runAudit(url);
    // Persist for the lead step: the client receives only an ID, so emailed
    // PDFs always derive from this stored audit — never caller input.
    const auditId = saveAudit(result);
    // Internal notification (domain + IP + technical PDF) even when the
    // visitor never completes the lead form. Email failure must never fail
    // the analysis itself.
    try {
      const provider = getMailProvider();
      const config = getAuditMailConfig();
      if (config.inbox && config.from) {
        const mailed = await sendInternalAuditEmail(provider, config, {
          audit: result,
          ip: ip === "unknown" ? undefined : ip,
        });
        if (!mailed.success) {
          console.error(`[audit] internal mail failed: ${mailed.error.code}`);
        }
      }
    } catch (mailError) {
      console.error(
        `[audit] internal mail error: ${mailError instanceof Error ? mailError.message.slice(0, 200) : "unknown"}`,
      );
    }
    return NextResponse.json({ ok: true, audit: result, auditId });
  } catch (error) {
    if (error instanceof UrlValidationError) {
      console.error(`[audit] validation rejected: ${error.code}`);
      return NextResponse.json(
        { ok: false, error: safeValidationMessage(error.code) },
        { status: 400 },
      );
    }
    // Server-side diagnostics only — the client gets a safe message.
    console.error(
      `[audit] failed for ${url.slice(0, 120)}: ${error instanceof Error ? error.message.slice(0, 300) : "unknown"}`,
    );
    return NextResponse.json(
      { ok: false, error: safeErrorMessage(error) },
      { status: 422 },
    );
  }
}
