import "server-only";

import { NextResponse } from "next/server";
import {
  getContactMailConfig,
  submitContact,
} from "@/lib/contact/contact-service";
import { getMailProvider } from "@/lib/mail/provider-factory";

/** Lightweight in-memory throttle: 5 submissions / 10 min per IP. */
const hits = new Map<string, number[]>();
const WINDOW_MS = 10 * 60 * 1000;
const MAX_HITS = 5;

function isRateLimited(ip: string): boolean {
  const now = Date.now();
  const arr = (hits.get(ip) ?? []).filter((t) => now - t < WINDOW_MS);
  arr.push(now);
  hits.set(ip, arr);
  return arr.length > MAX_HITS;
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
