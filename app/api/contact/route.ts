import "server-only";

import { NextResponse } from "next/server";
import { databaseCatalogueEnabled } from "@/lib/catalogue/server";
import { getPublishedWebPackage, getPublishedWebPriceOption } from "@/db/catalogue";
import { isPublicWebPrice, type WebPriceOption } from "@/lib/catalogue/commercial";
import {
  getContactMailConfig,
  submitContact,
} from "@/lib/contact/contact-service";
import type { MailProvider } from "@/lib/mail/mail-provider";
import { getMailProvider } from "@/lib/mail/provider-factory";
import {
  parseExpectedHostnames,
  verifyTurnstileToken,
} from "@/lib/turnstile/verify";

/**
 * Lightweight in-memory throttle: 5 submissions / 10 min per key.
 *
 * Trust boundary: the key is the first forwarded-for value, which is only
 * trustworthy behind a proxy that sets/strips it. Counters are per-process
 * and reset on restart — a shared quota across instances needs an external
 * store (e.g. Redis/Upstash), deliberately out of scope here.
 */
const hits = new Map<string, number[]>();
const WINDOW_MS = 10 * 60 * 1000;
const MAX_HITS = 5;
// Global bound so distinct-key floods cannot grow the map without limit.
const MAX_TRACKED_IPS = 5000;
let lastCleanup = 0;

// Drop expired timestamps and empty keys so the map cannot grow
// unboundedly. Runs at most once per window to keep the hot path cheap.
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
  // Rejected attempts are not recorded, so abuse cannot grow retained state.
  if (active.length >= MAX_HITS) return true;
  active.push(now);
  hits.set(ip, active);
  // Global bound with oldest-first eviction.
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

  // Turnstile gate: the form must not submit without a passing check.
  // Tokens are single-use; verification happens before mail delivery.
  const token =
    typeof body === "object" && body !== null
      ? (body as Record<string, unknown>).turnstileToken
      : undefined;
  const verification = await verifyTurnstileToken({
    token,
    remoteip: ip === "unknown" ? undefined : ip,
    secret: process.env.TURNSTILE_SECRET,
    expectedAction: "contact",
    expectedHostnames: parseExpectedHostnames(process.env.TURNSTILE_HOSTNAMES),
  });
  if (!verification.ok) {
    console.error(`[contact] turnstile rejected: ${verification.reason}`);
    return NextResponse.json(
      {
        ok: false,
        error: "Verification failed. Please complete the check and try again.",
        turnstile: true,
      },
      { status: 403 },
    );
  }

  let approvedPackageName: string | undefined;
  let approvedPriceOptionLabel: string | undefined;
  // In catalogue mode, package IDs must resolve to a published Neon record.
  // Do not trust a package ID supplied by the browser or a stale promotion.
  if (databaseCatalogueEnabled() && typeof body === "object" && body !== null) {
    const submitted = body as Record<string, unknown>;
    const packageId = typeof submitted.package === "string" ? submitted.package.trim() : "";
    if (submitted.service === "Web Development" && packageId) {
      const approved = await getPublishedWebPackage(packageId);
      if (!approved) {
        return NextResponse.json(
          { ok: false, error: "This package is not currently available. Please choose another option." },
          { status: 400 },
        );
      }
      approvedPackageName = approved.name;
      const optionId = typeof submitted.priceOption === "string" ? submitted.priceOption.trim() : "";
      if (optionId) {
        const priceOption = await getPublishedWebPriceOption(optionId);
        if (!priceOption || priceOption.packageId !== approved.id ||
            !isPublicWebPrice(priceOption as WebPriceOption, new Set([approved.id]))) {
          return NextResponse.json(
            { ok: false, error: "That payment option is no longer available. Please select an available option." },
            { status: 400 },
          );
        }
        const modes: Record<string, string> = {
          managed_monthly: "Managed Monthly",
          once_off: "Once-Off",
          self_hosted: "Self-Hosted",
        };
        approvedPriceOptionLabel = modes[priceOption.billingMode];
      }
    } else if (submitted.priceOption) {
      // A billing option must never be accepted without its parent package.
      return NextResponse.json(
        { ok: false, error: "Please select a website package for this payment option." },
        { status: 400 },
      );
    }
  }

  if (databaseCatalogueEnabled() && typeof body === "object" && body !== null) {
    const candidate = body as Record<string, unknown>;
    // Reject option claims for unrelated services rather than silently
    // dropping submitted commercial context.
    if (candidate.priceOption && candidate.service !== "Web Development") {
      return NextResponse.json(
        { ok: false, error: "Payment options are only available with Web Development packages." },
        { status: 400 },
      );
    }
  }

  let provider: MailProvider;
  try {
    provider = getMailProvider();
  } catch {
    console.error("[contact] provider config error");
    return NextResponse.json(
      {
        ok: false,
        error:
          "Something went wrong sending your message. Please try again or email info@mogen.co.za.",
      },
      { status: 500 },
    );
  }

  const result = await submitContact(body, provider, getContactMailConfig(), {
    approvedPackageName,
    approvedPriceOptionLabel,
  });
  if (!result.ok) {
    const status = result.fieldErrors ? 400 : 502;
    return NextResponse.json(result, { status });
  }
  return NextResponse.json({ ok: true });
}
