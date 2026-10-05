/**
 * Audit orchestrator: bounded same-origin crawl → snapshots → 37 checks →
 * deterministic score → AuditResult.
 *
 * Bounds (public analyser):
 * - max 10 HTML pages, 2 MB per page, 15 s per request, 4 redirects.
 * - No headless browser — server-returned HTML only.
 */

import * as cheerio from "cheerio";
import { createHash, randomUUID } from "node:crypto";
import {
  runChecks,
  type CanonicalVerification,
  type RobotsSnapshot,
  type SitemapSnapshot,
} from "./checks";
import { SafeFetchError, safeFetch } from "./fetcher";
import { parsePage, type PageData } from "./parser";
import { scoreFindings, scoreQuadrants } from "./scoring";
import { ENGINE_VERSION, RULE_SET_VERSION, type AuditResult } from "./types";
import { MAX_PAGES, validateUrlForFetch } from "./url-validation";

export interface AuditOptions {
  fetchFn?: import("./fetcher").FetchFunction;
  now?: () => string;
  /** Overall audit deadline (default 90 s); requests stop starting once reached. */
  timeoutMs?: number;
}

export const AUDIT_TIMEOUT_MS = 90_000;

function parseSitemapXml(xml: string, origin: string): Omit<SitemapSnapshot, "url" | "status" | "contentType"> {
  const empty = {
    validXml: false, kind: "unknown" as const, discoveredUrls: [] as string[],
    invalidEntries: 0, duplicateUrls: 0, offOriginUrls: 0,
  };
  let $: cheerio.CheerioAPI;
  try {
    $ = cheerio.load(xml, { xmlMode: true });
  } catch {
    return empty;
  }
  const isUrlset = $("urlset").length > 0;
  const isIndex = $("sitemapindex").length > 0;
  if (!isUrlset && !isIndex) return empty;
  const locs = (isUrlset ? $("url > loc") : $("sitemap > loc"))
    .map((_, el) => $(el).text().trim())
    .get()
    .filter(Boolean)
    .slice(0, 1000);
  const seen = new Set<string>();
  let duplicates = 0;
  let offOrigin = 0;
  const valid: string[] = [];
  for (const loc of locs) {
    try {
      const u = new URL(loc);
      if (u.protocol !== "http:" && u.protocol !== "https:") continue;
      if (seen.has(u.toString())) {
        duplicates += 1;
        continue;
      }
      seen.add(u.toString());
      if (u.origin !== origin) offOrigin += 1;
      valid.push(u.toString());
    } catch {
      // invalid entry
    }
  }
  return {
    validXml: true,
    kind: isUrlset ? "urlset" : "sitemapindex",
    discoveredUrls: valid.slice(0, 200),
    invalidEntries: locs.length - valid.length - duplicates,
    duplicateUrls: duplicates,
    offOriginUrls: offOrigin,
  };
}

function parseRobots(body: string): { sitemapRefs: string[]; disallowRules: string[] } {
  const sitemapRefs: string[] = [];
  const disallowRules: string[] = [];
  for (const line of body.split("\n")) {
    const clean = line.split("#")[0].trim();
    const sitemap = clean.match(/^sitemap\s*:\s*(\S+)/i);
    if (sitemap?.[1]) {
      sitemapRefs.push(sitemap[1].slice(0, 500));
      continue;
    }
    const disallow = clean.match(/^disallow\s*:\s*(\S*)/i);
    if (disallow && disallow[1] !== undefined) {
      disallowRules.push(disallow[1].slice(0, 200));
    }
  }
  return { sitemapRefs: sitemapRefs.slice(0, 10), disallowRules: disallowRules.slice(0, 50) };
}

export async function runAudit(submittedRaw: string, options: AuditOptions = {}): Promise<AuditResult> {
  const {
    fetchFn,
    now = () => new Date().toISOString(),
    timeoutMs = AUDIT_TIMEOUT_MS,
  } = options;
  const observedAt = now();
  // Overall deadline for the whole audit; every request combines it with its
  // own per-request timeout, and optional stages stop starting once reached.
  const overall = AbortSignal.timeout(timeoutMs);
  const live = (): boolean => !overall.aborted;
  const deps = { ...(fetchFn ? { fetchFn } : {}), signal: overall };

  const validated = await validateUrlForFetch(submittedRaw);
  const domain = new URL(validated.url).hostname;

  // ——— 1. Fetch entry (follows redirects safely) ———
  const entryRes = await safeFetch(validated.url, deps);
  const finalUrl = entryRes.finalUrl;
  const finalOrigin = new URL(finalUrl).origin;

  const pages: PageData[] = [];
  const analysedUrls: string[] = [];
  const visited = new Set<string>();
  // Reuse the entry response instead of fetching the same URL twice.
  let pagesRequested = 1;
  const entryContentType = entryRes.contentType ?? "";
  if (
    entryContentType !== "" &&
    !entryContentType.includes("text/html") &&
    !entryContentType.includes("application/xhtml")
  ) {
    throw new SafeFetchError("unreachable");
  }

  async function fetchPage(url: string): Promise<PageData | null> {
    pagesRequested += 1;
    try {
      const res = await safeFetch(url, deps);
      // Only analyse same-origin HTML responses.
      if (new URL(res.finalUrl).origin !== finalOrigin) return null;
      const ct = res.contentType ?? "";
      if (!ct.includes("text/html") && ct !== "" && !ct.includes("application/xhtml")) return null;
      return parsePage(res.finalUrl, res.status, res.body);
    } catch {
      return null;
    }
  }

  const entryPage = parsePage(entryRes.finalUrl, entryRes.status, entryRes.body);
  pages.push(entryPage);
  analysedUrls.push(entryPage.url);
  visited.add(entryPage.url);

  // ——— 2. Bounded same-origin BFS crawl ———
  const queue: string[] = entryPage.outlinks.filter((u) => {
    try {
      return new URL(u).origin === finalOrigin;
    } catch {
      return false;
    }
  });
  while (queue.length > 0 && pages.length < MAX_PAGES && live()) {
    const next = queue.shift() as string;
    if (visited.has(next)) continue;
    const page = await fetchPage(next);
    if (!page) {
      // Mark failed URLs visited so they are never retried.
      visited.add(next);
      continue;
    }
    // Skip aliases that resolve to an already-analysed page.
    if (visited.has(page.url)) {
      visited.add(next);
      continue;
    }
    visited.add(next);
    visited.add(page.url);
    pages.push(page);
    analysedUrls.push(page.url);
    for (const out of page.outlinks) {
      if (pages.length + queue.length >= MAX_PAGES * 2) break;
      try {
        if (new URL(out).origin === finalOrigin && !visited.has(out) && !queue.includes(out)) {
          queue.push(out);
        }
      } catch {
        // skip malformed
      }
    }
  }

  // ——— 3. robots.txt (skipped once the overall deadline passes) ———
  let robots: RobotsSnapshot;
  const robotsFallback: RobotsSnapshot = {
    url: `${finalOrigin}/robots.txt`,
    status: null,
    contentType: null,
    body: null,
    sitemapRefs: [],
    disallowRules: [],
    llmsTxtDetected: false,
  };
  if (!live()) {
    robots = robotsFallback;
  } else try {
    const res = await safeFetch(`${finalOrigin}/robots.txt`, { ...deps, maxBytes: 512 * 1024 });
    const parsed = res.status === 200 ? parseRobots(res.body) : { sitemapRefs: [], disallowRules: [] };
    robots = {
      url: `${finalOrigin}/robots.txt`,
      status: res.status,
      contentType: res.contentType,
      body: res.status === 200 ? res.body.slice(0, 8000) : null,
      sitemapRefs: parsed.sitemapRefs,
      disallowRules: parsed.disallowRules,
      llmsTxtDetected: false,
    };
  } catch {
    robots = robotsFallback;
  }

  // ——— 4. llms.txt (informational only, never scored) ———
  if (live()) {
    try {
      const res = await safeFetch(`${finalOrigin}/llms.txt`, { ...deps, maxBytes: 64 * 1024 });
      robots.llmsTxtDetected = res.status === 200 && res.body.trim() !== "";
    } catch {
      robots.llmsTxtDetected = false;
    }
  }

  // ——— 5. Sitemap (/sitemap.xml + first robots ref) ———
  let sitemap: SitemapSnapshot = {
    url: null, status: null, contentType: null, validXml: false,
    kind: "unknown", discoveredUrls: [], invalidEntries: 0, duplicateUrls: 0, offOriginUrls: 0,
  };
  const sitemapCandidates = [`${finalOrigin}/sitemap.xml`, ...robots.sitemapRefs.slice(0, 1)];
  for (const candidate of sitemapCandidates) {
    if (!live()) break;
    try {
      const parsed = await validateUrlForFetch(candidate);
      if (new URL(parsed.url).origin !== finalOrigin) continue;
      const res = await safeFetch(parsed.url, { ...deps, maxBytes: 1024 * 1024 });
      if (res.status !== 200) {
        if (sitemap.url === null) {
          sitemap = { ...sitemap, url: res.finalUrl, status: res.status, contentType: res.contentType };
        }
        continue;
      }
      const ct = res.contentType ?? "";
      if (!ct.includes("xml") && !res.body.trimStart().startsWith("<")) {
        sitemap = { ...sitemap, url: res.finalUrl, status: res.status, contentType: res.contentType, validXml: false };
        break;
      }
      sitemap = {
        url: res.finalUrl, status: res.status, contentType: res.contentType,
        ...parseSitemapXml(res.body, finalOrigin),
      };
      break;
    } catch {
      continue;
    }
  }

  // ——— 6. Canonical target verification (bounded, out of page budget) ———
  const canonicalTargets = new Map<string, CanonicalVerification>();
  const uniqueCanonicals = new Map<string, string>();
  for (const p of pages) {
    if (p.canonical === null) continue;
    try {
      const resolved = new URL(p.canonical, p.url).toString();
      if (!uniqueCanonicals.has(resolved)) uniqueCanonicals.set(resolved, p.url);
    } catch {
      // invalid canonical recorded by the check itself
    }
  }
  let verifyBudget = 5;
  for (const [resolved, pageUrl] of uniqueCanonicals) {
    if (verifyBudget <= 0 || !live()) break;
    verifyBudget -= 1;
    if (resolved === pageUrl) {
      canonicalTargets.set(resolved, { ok: true, status: 200, sameOrigin: true, selfCanonical: true });
      continue;
    }
    try {
      const res = await safeFetch(resolved, { ...deps, maxBytes: 256 * 1024 });
      canonicalTargets.set(resolved, {
        ok: res.status >= 200 && res.status < 400,
        status: res.status,
        sameOrigin: new URL(res.finalUrl).origin === finalOrigin,
        selfCanonical: false,
      });
    } catch {
      canonicalTargets.set(resolved, { ok: false, status: null, sameOrigin: false, selfCanonical: false });
    }
  }

  // ——— 7. Checks + scoring ———
  const findings = runChecks({
    now: observedAt,
    finalUrl,
    origin: finalOrigin,
    redirects: entryRes.redirects,
    pages,
    robots,
    sitemap,
    canonicalTargets,
  });
  const summary = scoreFindings(findings);
  const quadrants = scoreQuadrants(findings);

  return {
    id: randomUUID(),
    version: "1",
    engineVersion: ENGINE_VERSION,
    ruleSetVersion: RULE_SET_VERSION,
    generatedAt: observedAt,
    site: { submittedUrl: validated.url, finalUrl, domain },
    crawl: {
      submittedUrl: validated.url,
      finalUrl,
      domain,
      redirects: entryRes.redirects,
      pagesRequested,
      pagesAnalysed: pages.length,
      analysedUrls,
    },
    robots: {
      url: robots.url,
      status: robots.status,
      contentType: robots.contentType,
      body: robots.body,
      sitemapRefs: robots.sitemapRefs,
      disallowRules: robots.disallowRules,
      llmsTxtDetected: robots.llmsTxtDetected,
    },
    sitemap: {
      url: sitemap.url,
      status: sitemap.status,
      contentType: sitemap.contentType,
      validXml: sitemap.validXml,
      kind: sitemap.kind,
      discoveredUrls: sitemap.discoveredUrls,
      invalidEntries: sitemap.invalidEntries,
      duplicateUrls: sitemap.duplicateUrls,
      offOriginUrls: sitemap.offOriginUrls,
    },
    summary,
    quadrants,
    findings,
  };
}

/** Stable content fingerprint helper (used by tests). */
export function fingerprintEvidence(result: AuditResult): string {
  const material = JSON.stringify({
    site: result.site.finalUrl,
    findings: result.findings.map((f) => ({
      ruleId: f.ruleId, status: f.status, summary: f.summary,
      evidence: f.evidence.map((e) => ({ source: e.source, url: e.url, value: e.value })),
    })),
  });
  return createHash("sha256").update(material, "utf8").digest("hex");
}
