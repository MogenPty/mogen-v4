/**
 * Rampify server-side tracker — Vercel routing proxy (Next.js 16).
 *
 * Source template: https://www.rampify.dev/api/templates/vercel-proxy.ts
 * (kept faithful to upstream; local notes only where marked [mogen]).
 *
 * Captures pageviews from LLM agents (ChatGPT-User, Claude-User, Perplexity,
 * etc.), crawlers (Googlebot, Bingbot, Bytespider, GPTBot, etc.), and link-
 * preview unfurlers (Slackbot, Discordbot, etc.) — all the traffic that the
 * standard JS tracker never sees because it doesn't execute JavaScript.
 *
 * This is the COMPLEMENT to the client-side tracker.js snippet in
 * `app/layout.tsx`, not a replacement: tracker.js sees humans with JS;
 * this sees bots and AI fetchers (normal browser traffic is skipped by the
 * UA regex below, so there is no double-counting).
 *
 * Activation: set RAMPIFY_API_KEY (sk_live_* from the Rampify dashboard →
 * Settings → Server tracker) in `.env` locally and in Vercel env vars.
 * Without the key this is a transparent pass-through — the site keeps
 * working in every failure mode.
 */

import { NextRequest, NextResponse } from 'next/server';
import { waitUntil } from '@vercel/functions';

const COLLECT_URL = process.env.RAMPIFY_API_URL ?? 'https://www.rampify.dev/api/collect';

// One regex covering every UA bucket the server-side classifier recognizes.
// Audit-friendly: each line is a distinct pattern source, joined with `|`.
// Rampify's collect endpoint runs its own classifier on the UA we send to
// produce the canonical visitor_type bucket — this regex just decides
// "send or skip." Be permissive: false positives cost a row, false
// negatives lose data.
const TRACKABLE_UA_PATTERN = new RegExp(
  [
    // LLM user-agents (real-time fetches answering a person's question)
    'ChatGPT-User', 'OAI-SearchBot', 'Claude-User', 'Perplexity-User',
    'Copilot-User', 'Google-CloudVertex-Gemini', 'YouBot', 'DuckAssistBot', 'Phind',
    // LLM training/indexing crawlers
    'Bytespider', 'anthropic-ai', 'PerplexityBot', 'BingPreview', 'Kagibot', 'Meta-ExternalAgent',
    // Search + SEO + AI training crawlers
    'Googlebot', 'Bingbot', 'Baiduspider', 'YandexBot', 'DuckDuckBot', 'Sogou', 'Yeti/',
    'AhrefsBot', 'SemrushBot', 'MJ12bot', 'DotBot', 'PetalBot', 'Exabot',
    'GPTBot', 'ClaudeBot', 'Applebot-Extended', 'Google-Extended', 'CCBot', 'ia_archiver',
    // Link-preview unfurlers
    'Slackbot', 'Slack-ImgProxy', 'Discordbot', 'LinkedInBot', 'Twitterbot',
    'facebot', 'FacebookExternalHit', 'TelegramBot', 'WhatsApp', 'MicrosoftPreview', 'Apple-PubSub',
    // Headless / automation / monitoring
    'HeadlessChrome', 'phantom', 'selenium', 'puppeteer', 'playwright',
    'curl/', 'wget/', 'httpie', 'python-requests', 'aiohttp', 'axios', 'node-fetch',
    'got/', 'Go-http-client', 'Java/', 'lighthouse', 'pagespeed', 'gtmetrix', 'pingdom', 'uptimerobot',
    // Generic markers (catch-all for unnamed bots)
    '\\bbot\\b', 'crawl', 'spider', 'slurp', 'mediapartners',
  ].join('|'),
  'i'
);

const ASSET_EXTS = new Set([
  'css', 'js', 'mjs', 'map',
  'png', 'jpg', 'jpeg', 'gif', 'svg', 'ico', 'webp', 'avif',
  'woff', 'woff2', 'ttf', 'otf', 'eot',
  'txt', 'xml', 'json', 'webmanifest', 'pdf',
]);
const SKIP_PREFIXES = ['/_next/', '/_vercel/', '/api/', '/.well-known/'];
// AI-readable site maps + crawler directives we deliberately track despite the
// .txt/.xml extension, so you can see when LLMs and crawlers fetch them.
const AGENT_FILE_RE = /^\/(?:llms(?:-full)?\.txt|robots\.txt|sitemap[\w.-]*\.xml)$/i;

function shouldSkipPath(pathname: string): boolean {
  if (AGENT_FILE_RE.test(pathname)) return false; // track these despite the extension
  for (const p of SKIP_PREFIXES) if (pathname.startsWith(p)) return true;
  const dot = pathname.lastIndexOf('.');
  if (dot > 0) {
    const ext = pathname.slice(dot + 1).toLowerCase();
    if (ASSET_EXTS.has(ext)) return true;
  }
  return false;
}

function trackPageview(request: NextRequest): void {
  const apiKey = process.env.RAMPIFY_API_KEY;
  // Fail-silent: site renders normally even when the env var is missing.
  if (!apiKey) return;
  if (request.method !== 'GET') return;
  if (shouldSkipPath(request.nextUrl.pathname)) return;

  const ua = request.headers.get('user-agent') ?? '';
  if (!TRACKABLE_UA_PATTERN.test(ua)) return;

  // Pre-resolved geo from Vercel's edge headers — keeps the no-IP-storage
  // posture intact: Rampify's collect endpoint never sees the visitor's IP.
  const country = request.headers.get('x-vercel-ip-country');
  const region = request.headers.get('x-vercel-ip-country-region');

  const body = JSON.stringify({
    url: request.url,
    ref: request.headers.get('referer'),
    ua,
    country,
    region,
    lang: request.headers.get('accept-language')?.split(',')[0]?.slice(0, 20) ?? null,
  });

  // Fire-and-forget — never block the response on a Rampify hop.
  waitUntil(
    fetch(COLLECT_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body,
    }).catch((err) => {
      console.warn('[rampify] collect failed:', err?.message ?? err);
    })
  );
}

// Next.js 16 expects this file at the project root as `proxy.ts` with the
// exported function named `proxy` (verified against Next.js 16.3.3 —
// `middleware` as the export name is rejected at build time).
export function proxy(request: NextRequest): NextResponse {
  trackPageview(request);
  return NextResponse.next();
}

export const config = {
  // Match all routes by default. The path/extension skip list inside
  // trackPageview keeps assets cheap. To narrow at the matcher level
  // instead, see https://nextjs.org/docs/app/building-your-application/routing/middleware#matcher
  //
  // Note: txt/xml are intentionally NOT excluded here so the AI-readable maps
  // and crawler directives (llms.txt, robots.txt, sitemap.xml) reach the
  // function; shouldSkipPath still skips every other .txt/.xml asset.
  matcher: [
    '/((?!_next/|_vercel/|api/|.*\\.(?:css|js|mjs|map|png|jpg|jpeg|gif|svg|ico|webp|avif|woff|woff2|ttf|otf|eot|json|webmanifest|pdf)$).*)',
  ],
};
