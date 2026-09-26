import "server-only";

import { NextResponse } from "next/server";
import {
  getContactMailConfig,
  submitContact,
} from "@/lib/contact/contact-service";
import { getMailProvider } from "@/lib/mail/provider-factory";

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
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    "unknown";
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

  let provider;
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

  const result = await submitContact(body, provider, getContactMailConfig());
  if (!result.ok) {
    const status = result.fieldErrors ? 400 : 502;
    return NextResponse.json(result, { status });
  }
  return NextResponse.json({ ok: true });
}
