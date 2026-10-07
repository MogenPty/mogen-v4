/**
 * The 37 deterministic SEO checks.
 *
 * Principles:
 * - Every PASS / FAIL / WARN carries evidence tracing to a measurement.
 * - Missing data → NOT_ASSESSED (never FAIL, never zero).
 * - Genuinely inapplicable rules → NOT_APPLICABLE.
 * - Unconnected data sources (GSC, GBP, backlinks, rankings, CrUX, PSI)
 *   → NOT_ASSESSED, always, with an explicit reason.
 * - Length guidance (titles, descriptions) is labelled as a recommendation,
 *   never as a Google ranking rule.
 */

import { detectDuplicates, normalizeText } from "./duplicate";
import {
  INP_LAB_UNAVAILABLE_NOTE,
  type PageSpeedAnalysis,
  type PageSpeedEvidence,
} from "./pagespeed";
import type { PageData } from "./parser";
import type {
  AuditEvidence,
  EvidenceSource,
  Finding,
  FindingStatus,
} from "./types";

export interface RobotsSnapshot {
  url: string;
  status: number | null;
  contentType: string | null;
  body: string | null;
  sitemapRefs: string[];
  disallowRules: string[];
  llmsTxtDetected: boolean;
}

export interface SitemapSnapshot {
  url: string | null;
  status: number | null;
  contentType: string | null;
  validXml: boolean;
  kind: "urlset" | "sitemapindex" | "unknown";
  discoveredUrls: string[];
  invalidEntries: number;
  duplicateUrls: number;
  offOriginUrls: number;
}

export interface CanonicalVerification {
  ok: boolean;
  status: number | null;
  sameOrigin: boolean;
  selfCanonical: boolean;
}

export interface AnalysisInput {
  now: string;
  finalUrl: string;
  origin: string;
  redirects: { url: string; status: number }[];
  pages: PageData[];
  robots: RobotsSnapshot;
  sitemap: SitemapSnapshot;
  /** canonical href → verification (only for checked targets). */
  canonicalTargets: Map<string, CanonicalVerification>;
  /**
   * Normalized dual-strategy PageSpeed / Lighthouse lab evidence.
   * Null = both strategies unavailable → `performance-lab` stays NOT_ASSESSED.
   */
  psi?: PageSpeedAnalysis | null;
  /** Machine-readable reason when PageSpeed could not provide evidence. */
  psiReason?: string | null;
}

/**
 * Canonical thresholds for the `performance-lab` rule, following the
 * standard Lighthouse performance bands (0–49 poor, 50–89 needs
 * improvement, 90+ good). Scores are 0–1 as returned by PageSpeed.
 * Kept here — never hardcoded in report renderers.
 */
export const LAB_PERFORMANCE_THRESHOLDS = { pass: 0.9, warn: 0.5 } as const;

function ev(
  now: string,
  source: EvidenceSource,
  url: string | undefined,
  value: unknown,
  details?: string,
  expected?: unknown,
): AuditEvidence {
  return { source, observedAt: now, url, value, details, expected };
}

function finding(
  ruleId: string,
  status: FindingStatus,
  summary: string,
  evidence: AuditEvidence[],
  recommendation?: string,
): Finding {
  return { ruleId, status, summary, evidence, recommendation };
}

function share(pages: PageData[], predicate: (p: PageData) => boolean): number {
  if (pages.length === 0) return 0;
  return pages.filter(predicate).length / pages.length;
}

function aggregateStatus(okShare: number): FindingStatus {
  if (okShare >= 1) return "PASS";
  if (okShare >= 0.7) return "WARN";
  return "FAIL";
}

function truncate(value: string, max = 160): string {
  return value.length > max ? `${value.slice(0, max)}…` : value;
}

/**
 * BCP 47 shape check (not a full registry validation): 2–3 letter language,
 * optional 4-letter script, optional 2-letter region or 3-digit region.
 * Case-insensitive. Null/empty values are rejected by callers.
 */
export function isValidLangTag(tag: string): boolean {
  return /^[a-z]{2,3}(-[a-z]{4})?(-([a-z]{2}|[0-9]{3}))?$/i.test(tag.trim());
}

function formatMetricForSummary(
  label: string,
  valueMs: number | null,
  unitless?: number | null,
  isInp = false,
): string | null {
  if (unitless !== undefined) {
    if (unitless === null) return `${label} unavailable`;
    return `${label} ${unitless.toFixed(2)}`;
  }
  if (valueMs === null) {
    // INP absence is expected lab behaviour (field-only metric) — say so
    // explicitly instead of a bare "unavailable".
    return isInp ? `INP ${INP_LAB_UNAVAILABLE_NOTE}` : `${label} unavailable`;
  }
  if (valueMs >= 1000) return `${label} ${(valueMs / 1000).toFixed(1)} s`;
  return `${label} ${Math.round(valueMs)} ms`;
}

function strategySummaryEvidence(
  now: string,
  psi: PageSpeedEvidence,
): AuditEvidence {
  return ev(
    now,
    "psi",
    psi.url,
    {
      strategy: psi.strategy,
      provider: psi.provider,
      fetchedAt: psi.fetchedAt,
      version: psi.version,
      categories: psi.categories,
      metrics: psi.metrics,
    },
    `Google PageSpeed Insights — ${psi.strategy} lab analysis of ${psi.url}. ` +
      "Lighthouse is synthetic lab data, not real-user (CrUX field) data.",
  );
}

/**
 * Evaluate the `performance-lab` rule from normalized PageSpeed evidence.
 *
 * - Mobile and desktop are evaluated separately but feed one finding.
 *   Mobile is the canonical measurement; desktop is used only when mobile
 *   is unavailable. The Lighthouse score itself is never copied as an SEO
 *   score — the Mogen score uses its own weighting.
 * - No usable strategy, or no performance score on the usable strategy →
 *   NOT_ASSESSED with an explicit reason. Missing metrics stay
 *   unavailable, never zero — and INP is never derived from TBT.
 */
export function evaluatePerformanceLab(input: AnalysisInput): Finding {
  const { now, finalUrl } = input;
  const entryUrl = input.pages[0]?.url ?? finalUrl;
  const analysis = input.psi ?? null;
  const mobile = analysis?.mobile ?? null;
  const desktop = analysis?.desktop ?? null;

  if (!mobile && !desktop) {
    const reason =
      input.psiReason ??
      analysis?.mobileReason ??
      "Lab performance not measured — PageSpeed Insights / Lighthouse data unavailable. Performance is never inferred from HTML size, scripts, or framework.";
    return finding(
      "performance-lab",
      "NOT_ASSESSED",
      reason,
      [ev(now, "psi", entryUrl, { connected: false }, reason)],
    );
  }

  // Mobile is canonical; desktop is the genuine fallback, named as such.
  const primary = mobile ?? desktop;
  const secondary = mobile ? desktop : null;
  const primaryEvidence = primary as PageSpeedEvidence;
  const score = primaryEvidence.categories.performance;
  if (score === null) {
    return finding(
      "performance-lab",
      "NOT_ASSESSED",
      `Lighthouse ${primaryEvidence.strategy} lab analysis ran but returned no performance score — metric unavailable.`,
      [
        strategySummaryEvidence(now, primaryEvidence),
        ...(secondary ? [strategySummaryEvidence(now, secondary)] : []),
      ],
    );
  }

  const status: FindingStatus =
    score >= LAB_PERFORMANCE_THRESHOLDS.pass
      ? "PASS"
      : score >= LAB_PERFORMANCE_THRESHOLDS.warn
        ? "WARN"
        : "FAIL";
  const pct = Math.round(score * 100);
  const m = primaryEvidence.metrics;
  const parts = [
    formatMetricForSummary("LCP", m.lcpMs),
    formatMetricForSummary("INP", m.inpMs, undefined, true),
    formatMetricForSummary("CLS", null, m.cls),
    formatMetricForSummary("FCP", m.fcpMs),
    formatMetricForSummary("TTFB", m.ttfbMs),
    formatMetricForSummary("TBT", m.totalBlockingTimeMs),
  ].filter((x): x is string => x !== null);

  const strategyNote =
    secondary && secondary.categories.performance !== null
      ? ` (${primaryEvidence.strategy} lab; ${secondary.strategy} ${Math.round((secondary.categories.performance as number) * 100)}/100 also measured)`
      : ` (${primaryEvidence.strategy} lab)`;
  const summary =
    status === "PASS"
      ? `Lighthouse lab performance ${pct}/100${strategyNote} — ${parts.join("; ")}.`
      : status === "WARN"
        ? `Lighthouse lab performance ${pct}/100${strategyNote} needs improvement — ${parts.join("; ")}.`
        : `Lighthouse lab performance ${pct}/100${strategyNote} is poor — ${parts.join("; ")}.`;

  const evidence: AuditEvidence[] = [];
  for (const strat of [mobile, desktop]) {
    if (!strat) continue;
    evidence.push(strategySummaryEvidence(now, strat));
    // Per-metric provenance so the report can show each measurement's origin.
    const sm = strat.metrics;
    const metricProvenance: Array<[string, string, number | null, string, boolean]> = [
      ["largest-contentful-paint", "Largest Contentful Paint", sm.lcpMs, "ms", false],
      ["interaction-to-next-paint", "Interaction to Next Paint", sm.inpMs, "ms", true],
      ["cumulative-layout-shift", "Cumulative Layout Shift", sm.cls, "", false],
      ["first-contentful-paint", "First Contentful Paint", sm.fcpMs, "ms", false],
      ["server-response-time", "Time to First Byte", sm.ttfbMs, "ms", false],
      ["speed-index", "Speed Index", sm.speedIndexMs, "ms", false],
      ["total-blocking-time", "Total Blocking Time", sm.totalBlockingTimeMs, "ms", false],
    ];
    for (const [metricId, label, value, unit, isInp] of metricProvenance) {
      evidence.push(
        ev(
          now,
          "psi",
          strat.url,
          { metric: metricId, value, unit, strategy: strat.strategy },
          value === null
            ? isInp
              ? `${label}: ${INP_LAB_UNAVAILABLE_NOTE} (Google PageSpeed Insights, ${strat.strategy} lab).`
              : `${label}: unavailable (Google PageSpeed Insights, ${strat.strategy} lab).`
            : `${label}: ${unit === "" ? value : `${value} ${unit}`} (Google PageSpeed Insights, ${strat.strategy} lab).`,
        ),
      );
    }
  }

  return finding(
    "performance-lab",
    status,
    summary,
    evidence,
    status === "PASS"
      ? undefined
      : "Recommendation: improve the slowest lab measurements above (images, render-blocking scripts, server response) and re-run the audit.",
  );
}

export function runChecks(input: AnalysisInput): Finding[] {
  const { now, finalUrl, origin } = input;
  const pages = input.pages;
  const entry = pages[0];
  const findings: Finding[] = [];

  // ——— 1. HTTPS ———
  const isHttps = finalUrl.startsWith("https://");
  findings.push(
    finding(
      "https",
      isHttps ? "PASS" : "FAIL",
      isHttps ? "Site serves over HTTPS." : "Site does not serve over HTTPS.",
      [ev(now, "http", finalUrl, { protocol: new URL(finalUrl).protocol })],
      isHttps ? undefined : "Recommendation: serve the site over HTTPS.",
    ),
  );

  // ——— 2. Redirect chain ———
  const hops = input.redirects.length;
  findings.push(
    finding(
      "redirect-chain",
      hops <= 2 ? "PASS" : "WARN",
      hops === 0
        ? "No redirects — submitted URL resolved directly."
        : `${hops} redirect hop${hops === 1 ? "" : "s"} before the final URL.`,
      [
        ev(now, "http", finalUrl, {
          hops: input.redirects.map((r) => ({ status: r.status, url: r.url })),
          finalUrl,
        }),
      ],
      hops > 2 ? "Recommendation: shorten redirect chains where practical." : undefined,
    ),
  );

  // ——— 3. robots.txt ———
  {
    const r = input.robots;
    let status: FindingStatus;
    let summary: string;
    if (r.status === null) {
      status = "NOT_ASSESSED";
      summary = "robots.txt could not be fetched.";
    } else if (r.status === 200 && r.body && r.body.trim() !== "") {
      const blocksAll = r.disallowRules.some((d) => d === "/" || d === "/*");
      status = blocksAll ? "WARN" : "PASS";
      summary = blocksAll
        ? "robots.txt blocks all crawling (Disallow: /). Verify this is intentional."
        : "robots.txt fetched successfully.";
    } else if (r.status === 404) {
      status = "WARN";
      summary = "No robots.txt found (HTTP 404). Not blocking, but recommended.";
    } else {
      status = "WARN";
      summary = `robots.txt returned HTTP ${r.status}.`;
    }
    const evidence = [
      ev(now, "robots", r.url, {
        status: r.status,
        contentType: r.contentType,
        bytes: r.body?.length ?? 0,
        disallowRules: r.disallowRules.slice(0, 20),
        sitemapRefs: r.sitemapRefs.slice(0, 10),
      }),
    ];
    if (r.llmsTxtDetected) {
      evidence.push(
        ev(now, "http", `${origin}/llms.txt`, { detected: true }, "llms.txt detected — informational only, not scored."),
      );
    }
    findings.push(
      finding("robots-txt", status, summary, evidence,
        status === "WARN" ? "Recommendation: publish a robots.txt that allows crawling of public pages." : undefined),
    );
  }

  // ——— 4/5. Sitemap ———
  {
    const s = input.sitemap;
    if (s.url === null || s.status === null) {
      findings.push(
        finding("sitemap-present", "WARN", "No sitemap discovered at /sitemap.xml or via robots.txt.",
          [ev(now, "sitemap", `${origin}/sitemap.xml`, { status: s.status },
            "Checked /sitemap.xml and robots.txt sitemap references.")],
          "Recommendation: publish an XML sitemap and reference it in robots.txt."),
      );
      findings.push(
        finding("sitemap-valid", "NOT_APPLICABLE", "No sitemap to validate.", []),
      );
    } else if (s.status !== 200) {
      findings.push(
        finding("sitemap-present", "WARN", `Sitemap URL returned HTTP ${s.status}.`,
          [ev(now, "sitemap", s.url, { status: s.status, contentType: s.contentType })]),
      );
      findings.push(
        finding("sitemap-valid", "NOT_ASSESSED", "Sitemap could not be retrieved for validation.",
          [ev(now, "sitemap", s.url, { status: s.status })]),
      );
    } else {
      findings.push(
        finding("sitemap-present", "PASS", `Sitemap discovered at ${s.url}.`,
          [ev(now, "sitemap", s.url, { status: s.status, contentType: s.contentType, urls: s.discoveredUrls.length })]),
      );
      const problems: string[] = [];
      if (!s.validXml) problems.push("invalid XML");
      if (s.invalidEntries > 0) problems.push(`${s.invalidEntries} invalid entries`);
      if (s.duplicateUrls > 0) problems.push(`${s.duplicateUrls} duplicate URLs`);
      if (problems.length === 0) {
        findings.push(
          finding("sitemap-valid", "PASS", `Sitemap XML valid (${s.kind}, ${s.discoveredUrls.length} URLs).`,
            [ev(now, "sitemap", s.url, { kind: s.kind, urls: s.discoveredUrls.length, offOrigin: s.offOriginUrls })]),
        );
      } else {
        findings.push(
          finding("sitemap-valid", "WARN", `Sitemap has issues: ${problems.join("; ")}.`,
            [ev(now, "sitemap", s.url, {
              kind: s.kind, urls: s.discoveredUrls.length,
              invalidEntries: s.invalidEntries, duplicateUrls: s.duplicateUrls,
              offOriginUrls: s.offOriginUrls,
            })],
            "Recommendation: fix invalid entries and remove duplicates."),
        );
      }
    }
  }

  // ——— 6. Canonical present ———
  if (pages.length === 0) {
    findings.push(finding("canonical-present", "NOT_ASSESSED", "No pages analysed.", []));
  } else {
    const okShare = share(pages, (p) => p.canonical !== null);
    findings.push(
      finding(
        "canonical-present",
        aggregateStatus(okShare),
        okShare >= 1
          ? `Canonical link present on all ${pages.length} analysed pages.`
          : `${Math.round(okShare * 100)}% of analysed pages declare a canonical URL.`,
        pages.slice(0, 10).map((p) =>
          ev(now, "html", p.url, { canonical: p.canonical }, "Observed <link rel=\"canonical\"> value."),
        ),
        okShare < 1 ? "Recommendation: add a self-referencing canonical to each indexable page." : undefined,
      ),
    );
  }

  // ——— 7. Canonical target ———
  {
    const canonicals = pages.filter((p) => p.canonical !== null);
    if (canonicals.length === 0) {
      findings.push(finding("canonical-target", "NOT_APPLICABLE", "No canonical URLs to verify.", []));
    } else {
      const evidence: AuditEvidence[] = [];
      let broken = 0;
      let crossOrigin = 0;
      for (const p of canonicals) {
        const href = p.canonical as string;
        let resolved: string;
        try {
          resolved = new URL(href, p.url).toString();
        } catch {
          broken += 1;
          evidence.push(ev(now, "html", p.url, { canonical: href }, "Canonical value is not a valid URL."));
          continue;
        }
        const check = input.canonicalTargets.get(resolved);
        if (!check) {
          evidence.push(ev(now, "html", p.url, { canonical: resolved }, "Target not fetched (self-canonical or out of verification budget)."));
          continue;
        }
        evidence.push(
          ev(now, "http", p.url, {
            canonical: resolved, status: check.status,
            sameOrigin: check.sameOrigin, selfCanonical: check.selfCanonical,
          }),
        );
        if (!check.ok) broken += 1;
        else if (!check.sameOrigin) crossOrigin += 1;
      }
      const status: FindingStatus =
        broken > 0 ? "FAIL" : crossOrigin > 0 ? "WARN" : "PASS";
      findings.push(
        finding(
          "canonical-target",
          status,
          broken > 0
            ? `${broken} canonical target${broken === 1 ? "" : "s"} do not resolve.`
            : crossOrigin > 0
              ? "Canonical targets resolve; some point cross-origin."
              : "Canonical targets resolve.",
          evidence,
          broken > 0 ? "Fix canonical URLs that point to broken pages." : undefined,
        ),
      );
    }
  }

  // ——— 8. Viewport ———
  if (!entry) {
    findings.push(finding("viewport", "NOT_ASSESSED", "No pages analysed.", []));
  } else {
    const okShare = share(pages, (p) => p.viewport !== null && p.viewport.includes("width="));
    findings.push(
      finding("viewport", aggregateStatus(okShare),
        okShare >= 1 ? "Viewport meta present on all analysed pages." : `${Math.round(okShare * 100)}% of analysed pages declare a usable viewport.`,
        pages.slice(0, 10).map((p) => ev(now, "html", p.url, { viewport: p.viewport }))),
    );
  }

  // ——— 9. HTML lang ———
  if (!entry) {
    findings.push(finding("html-lang", "NOT_ASSESSED", "No pages analysed.", []));
  } else {
    const okShare = share(pages, (p) => p.lang !== null && isValidLangTag(p.lang));
    findings.push(
      finding("html-lang", aggregateStatus(okShare),
        okShare >= 1 ? "Valid <html lang> on all analysed pages." : `${Math.round(okShare * 100)}% of analysed pages declare a valid <html lang>.`,
        pages.slice(0, 10).map((p) => ev(now, "html", p.url, { lang: p.lang }))),
    );
  }

  // ——— 10. Charset ———
  if (!entry) {
    findings.push(finding("charset", "NOT_ASSESSED", "No pages analysed.", []));
  } else {
    const okShare = share(pages, (p) => p.charset !== null);
    findings.push(
      finding("charset", aggregateStatus(okShare),
        okShare >= 1 ? "Charset declared on all analysed pages." : `${Math.round(okShare * 100)}% of analysed pages declare a charset.`,
        pages.slice(0, 10).map((p) => ev(now, "html", p.url, { charset: p.charset }))),
    );
  }

  // ——— 11. Robots meta ———
  if (!entry) {
    findings.push(finding("robots-meta", "NOT_ASSESSED", "No pages analysed.", []));
  } else {
    const blocking = pages.filter((p) => p.robotsMeta !== null && /noindex|none/i.test(p.robotsMeta));
    findings.push(
      finding("robots-meta", blocking.length > 0 ? "FAIL" : "PASS",
        blocking.length > 0
          ? `${blocking.length} analysed page${blocking.length === 1 ? "" : "s"} carry a noindex robots meta.`
          : "No blocking robots meta directives found.",
        pages.slice(0, 10).map((p) => ev(now, "html", p.url, { robotsMeta: p.robotsMeta }))),
    );
  }

  // ——— 12/13. Title ———
  if (!entry) {
    findings.push(finding("title-present", "NOT_ASSESSED", "No pages analysed.", []));
    findings.push(finding("title-length", "NOT_ASSESSED", "No pages analysed.", []));
  } else {
    const okShare = share(pages, (p) => (p.title ?? "") !== "");
    findings.push(
      finding("title-present", aggregateStatus(okShare),
        okShare >= 1 ? `Title present on all ${pages.length} analysed pages.` : `${Math.round(okShare * 100)}% of analysed pages have a <title>.`,
        pages.slice(0, 10).map((p) => ev(now, "html", p.url, { title: p.title ? truncate(p.title) : null, length: p.title?.length ?? 0 }))),
    );
    const titled = pages.filter((p) => (p.title ?? "") !== "");
    if (titled.length === 0) {
      findings.push(finding("title-length", "NOT_APPLICABLE", "No titles to measure.", []));
    } else {
      const ok = titled.filter((p) => (p.title as string).length >= 30 && (p.title as string).length <= 60).length;
      const status: FindingStatus = ok === titled.length ? "PASS" : "WARN";
      findings.push(
        finding("title-length", status,
          `${ok}/${titled.length} titles within the 30–60 character guidance band.`,
          titled.slice(0, 10).map((p) => ev(now, "html", p.url, { length: (p.title as string).length })),
          "Recommendation (guidance only, not a Google rule): keep titles roughly 30–60 characters so they display well in search results.",
        ),
      );
    }
  }

  // ——— 14/15. Meta description ———
  if (!entry) {
    findings.push(finding("meta-description-present", "NOT_ASSESSED", "No pages analysed.", []));
    findings.push(finding("meta-description-length", "NOT_ASSESSED", "No pages analysed.", []));
  } else {
    const okShare = share(pages, (p) => (p.metaDescription ?? "") !== "");
    findings.push(
      finding("meta-description-present", aggregateStatus(okShare),
        okShare >= 1 ? `Meta description present on all ${pages.length} analysed pages.` : `${Math.round(okShare * 100)}% of analysed pages have a meta description.`,
        pages.slice(0, 10).map((p) => ev(now, "html", p.url, {
          description: p.metaDescription ? truncate(p.metaDescription) : null,
          length: p.metaDescription?.length ?? 0,
        }))),
    );
    const described = pages.filter((p) => (p.metaDescription ?? "") !== "");
    if (described.length === 0) {
      findings.push(finding("meta-description-length", "NOT_APPLICABLE", "No meta descriptions to measure.", []));
    } else {
      const ok = described.filter((p) => (p.metaDescription as string).length >= 120 && (p.metaDescription as string).length <= 160).length;
      findings.push(
        finding("meta-description-length", ok === described.length ? "PASS" : "WARN",
          `${ok}/${described.length} descriptions within the 120–160 character guidance band.`,
          described.slice(0, 10).map((p) => ev(now, "html", p.url, { length: (p.metaDescription as string).length })),
          "Recommendation (guidance only, not a Google rule): keep meta descriptions roughly 120–160 characters.",
        ),
      );
    }
  }

  // ——— 16. H1 ———
  if (!entry) {
    findings.push(finding("h1", "NOT_ASSESSED", "No pages analysed.", []));
  } else {
    const missing = pages.filter((p) => p.headings.h1.length === 0).length;
    const multiple = pages.filter((p) => p.headings.h1.length > 1).length;
    const status: FindingStatus = missing === 0 && multiple === 0 ? "PASS" : missing > 0 ? "FAIL" : "WARN";
    const h1Evidence = pages
      .slice(0, 10)
      .map((p) =>
        ev(now, "html", p.url, {
          h1Count: p.headings.h1.length,
          h1: p.headings.h1.slice(0, 3).map((h) => truncate(h, 80)),
        }),
      );
    findings.push(
      finding(
        "h1",
        status,
        status === "PASS"
          ? `Exactly one H1 on all ${pages.length} analysed pages.`
          : `${missing} page${missing === 1 ? "" : "s"} without H1; ${multiple} with multiple H1s.`,
        h1Evidence,
        status === "WARN"
          ? "Multiple H1s are flagged for review, not treated as a severe failure."
          : undefined,
      ),
    );
  }

  // ——— 17. Heading order ———
  if (!entry) {
    findings.push(finding("heading-order", "NOT_ASSESSED", "No pages analysed.", []));
  } else {
    const evidence: AuditEvidence[] = [];
    let violations = 0;
    for (const p of pages.slice(0, 10)) {
      // Heuristic on counts (document order is not reconstructed): flag
      // when h3+ exists without h2, or h2+ without h1.
      const skipped =
        (p.headings.h3.length > 0 && p.headings.h2.length === 0) ||
        ((p.headings.h2.length > 0) && p.headings.h1.length === 0);
      if (skipped) violations += 1;
      evidence.push(ev(now, "html", p.url, {
        h1: p.headings.h1.length, h2: p.headings.h2.length, h3: p.headings.h3.length,
        skippedLevel: skipped,
      }));
    }
    findings.push(
      finding("heading-order", violations === 0 ? "PASS" : "WARN",
        violations === 0 ? "No skipped heading levels detected." : `${violations} analysed pages skip heading levels.`,
        evidence,
        violations > 0 ? "Recommendation: keep heading levels in order (H1 → H2 → H3)." : undefined),
    );
  }

  // ——— 18/19. Images ———
  {
    const allImages = pages.flatMap((p) => p.images.map((img) => ({ page: p.url, img })));
    if (allImages.length === 0) {
      findings.push(finding("images-alt", "NOT_APPLICABLE", "No images found on analysed pages.", []));
      findings.push(finding("images-dimensions", "NOT_APPLICABLE", "No images found on analysed pages.", []));
    } else {
      const withAlt = allImages.filter(({ img }) => (img.alt ?? "") !== "").length;
      const altShare = withAlt / allImages.length;
      findings.push(
        finding("images-alt", altShare >= 1 ? "PASS" : altShare >= 0.8 ? "WARN" : "FAIL",
          `${withAlt}/${allImages.length} images have non-empty alt text.`,
          [ev(now, "html", entry?.url, {
            total: allImages.length, withAlt,
            missing: allImages.filter(({ img }) => (img.alt ?? "") === "").slice(0, 10).map(({ img, page }) => ({ page, src: img.src?.slice(0, 120) })),
          })]),
      );
      const withDims = allImages.filter(({ img }) => img.width !== null && img.height !== null).length;
      const dimShare = withDims / allImages.length;
      findings.push(
        finding("images-dimensions", dimShare >= 1 ? "PASS" : dimShare >= 0.8 ? "WARN" : "FAIL",
          `${withDims}/${allImages.length} images declare width and height.`,
          [ev(now, "html", entry?.url, { total: allImages.length, withDimensions: withDims })],
          dimShare < 1 ? "Recommendation: declare intrinsic width/height to reduce layout shift." : undefined),
      );
    }
  }

  // ——— 20. Content volume ———
  if (pages.length === 0) {
    findings.push(finding("content-volume", "NOT_ASSESSED", "No pages analysed.", []));
  } else {
    const counts = pages.map((p) => normalizeText(p.visibleText).split(" ").filter(Boolean).length);
    const median = [...counts].sort((a, b) => a - b)[Math.floor(counts.length / 2)];
    findings.push(
      finding("content-volume", median >= 300 ? "PASS" : median >= 100 ? "WARN" : "FAIL",
        `Median visible copy across analysed pages: ${median} words.`,
        pages.slice(0, 10).map((p, i) => ev(now, "dom", p.url, { words: counts[i] }))),
    );
  }

  // ——— 21. Duplicate content ———
  {
    const eligible = pages.filter((p) => normalizeText(p.visibleText).split(" ").filter(Boolean).length >= 30);
    if (pages.length < 2 || eligible.length < 2) {
      findings.push(
        finding("duplicate-content", "NOT_ASSESSED", "Too few substantive pages to assess duplication.",
          [ev(now, "dom", entry?.url, { pagesAnalysed: pages.length, eligiblePages: eligible.length },
            "Duplication requires at least 2 comparable pages.")]),
      );
    } else {
      const report = detectDuplicates(pages.map((p) => ({ url: p.url, visibleText: p.visibleText })));
      if (report.exactCount > 0) {
        findings.push(
          finding("duplicate-content", "FAIL", `${report.exactCount} exact-duplicate page pair${report.exactCount === 1 ? "" : "s"} found.`,
            report.pairs.filter((x) => x.exact).slice(0, 10).map((x) =>
              ev(now, "dom", x.urlA, { duplicateOf: x.urlB, exact: true, similarity: 1 }))),
        );
      } else if (report.nearCount > 0) {
        findings.push(
          finding("duplicate-content", "WARN", `${report.nearCount} near-duplicate page pair${report.nearCount === 1 ? "" : "s"} found.`,
            report.pairs.filter((x) => !x.exact).slice(0, 10).map((x) =>
              ev(now, "dom", x.urlA, { duplicateOf: x.urlB, exact: false, similarity: Math.round(x.similarity * 100) / 100 }))),
        );
      } else {
        findings.push(
          finding("duplicate-content", "PASS", `No duplicate content across ${eligible.length} comparable pages.`,
            [ev(now, "dom", entry?.url, { comparedPages: eligible.length, exactPairs: 0, nearPairs: 0 },
              "Content hashes and shingle similarity compared pairwise.")]),
        );
      }
    }
  }

  // ——— 22. Internal linking ———
  if (!entry) {
    findings.push(finding("internal-linking", "NOT_ASSESSED", "No pages analysed.", []));
  } else {
    const internalCount = entry.links.filter((l) => !l.external).length;
    const emptyAnchors = entry.links.filter((l) => !l.external && l.text === "").length;
    findings.push(
      finding("internal-linking", internalCount >= 3 ? "PASS" : "WARN",
        `Entry page has ${internalCount} internal links${emptyAnchors > 0 ? ` (${emptyAnchors} with empty anchor text)` : ""}.`,
        [ev(now, "html", entry.url, {
          internalLinks: internalCount, emptyAnchors,
          sample: entry.links.filter((l) => !l.external).slice(0, 10).map((l) => ({ href: l.href.slice(0, 120), text: truncate(l.text, 60) })),
        })]),
    );
  }

  // ——— 23. External link attributes ———
  if (!entry) {
    findings.push(finding("external-link-attrs", "NOT_ASSESSED", "No pages analysed.", []));
  } else {
    const externals = entry.links.filter((l) => l.external && /^https?:/i.test(l.href));
    if (externals.length === 0) {
      findings.push(finding("external-link-attrs", "NOT_APPLICABLE", "No external links on the entry page.", []));
    } else {
      const withRel = externals.filter((l) => (l.rel ?? "") !== "").length;
      findings.push(
        finding("external-link-attrs", withRel === externals.length ? "PASS" : "WARN",
          `${withRel}/${externals.length} external links carry a rel attribute.`,
          [ev(now, "html", entry.url, {
            externalLinks: externals.length, withRel,
            sample: externals.slice(0, 10).map((l) => ({ href: l.href.slice(0, 120), rel: l.rel })),
          })],
          withRel < externals.length ? "Recommendation: use rel=\"nofollow\" / \"sponsored\" / \"ugc\" where appropriate. Outbound links are not backlinks." : undefined),
      );
    }
  }

  // ——— faq-content (weight 0, informational) ———
  {
    const withFaq = pages.filter((p) => p.hasFaq);
    findings.push(
      finding("faq-content", withFaq.length > 0 ? "PASS" : "NOT_APPLICABLE",
        withFaq.length > 0
          ? `FAQ content detected on ${withFaq.length} page${withFaq.length === 1 ? "" : "s"} (informational — quantity is not a ranking requirement).`
          : "No FAQ content detected (informational only).",
        withFaq.length > 0
          ? withFaq.slice(0, 5).map((p) => ev(now, "html", p.url, { faqDetected: true }))
          : [],
        withFaq.length > 0 ? "FAQ markup alone does not confer rich-result eligibility." : undefined),
    );
  }

  // ——— 24. Open Graph ———
  if (!entry) {
    findings.push(finding("og-tags", "NOT_ASSESSED", "No pages analysed.", []));
  } else {
    const required = ["og:title", "og:description", "og:image"];
    const present = required.filter((k) => entry.og[k]);
    findings.push(
      finding("og-tags", present.length === 3 ? "PASS" : present.length > 0 ? "WARN" : "FAIL",
        present.length === 3 ? "Complete Open Graph tags (title, description, image)." : `${present.length}/3 core Open Graph tags present.`,
        [ev(now, "html", entry.url, { present, ogUrl: entry.og["og:url"] ?? null })]),
    );
  }

  // ——— 25. Twitter ———
  if (!entry) {
    findings.push(finding("twitter-tags", "NOT_ASSESSED", "No pages analysed.", []));
  } else {
    const hasCard = !!entry.twitter["twitter:card"];
    findings.push(
      finding("twitter-tags", hasCard ? "PASS" : "WARN",
        hasCard ? `Twitter card present (${entry.twitter["twitter:card"]}).` : "No Twitter card tags (non-blocking).",
        [ev(now, "html", entry.url, { card: entry.twitter["twitter:card"] ?? null, title: entry.twitter["twitter:title"] ?? null })]),
    );
  }

  // ——— 26/27. JSON-LD ———
  {
    const blocks = pages.flatMap((p) => p.jsonLd.map((b) => ({ page: p.url, block: b })));
    if (blocks.length === 0) {
      findings.push(
        finding("jsonld-syntax", "WARN", "No JSON-LD structured data found.",
          [ev(now, "html", entry?.url, { blocks: 0 })],
          "Recommendation: add JSON-LD structured data for eligible content."),
      );
      findings.push(finding("jsonld-structure", "NOT_APPLICABLE", "No JSON-LD blocks to inspect.", []));
    } else {
      const invalid = blocks.filter(({ block }) => block.parseError !== null);
      if (invalid.length > 0) {
        findings.push(
          finding("jsonld-syntax", "FAIL", `${invalid.length} JSON-LD block${invalid.length === 1 ? "" : "s"} failed to parse.`,
            invalid.slice(0, 5).map(({ page, block }) =>
              ev(now, "html", page, { parseError: block.parseError, raw: truncate(block.raw, 300) }))),
        );
      } else {
        findings.push(
          finding("jsonld-syntax", "PASS", `${blocks.length} JSON-LD block${blocks.length === 1 ? "" : "s"} parsed successfully (syntax only).`,
            blocks.slice(0, 5).map(({ page }) => ev(now, "html", page, { parsed: true }))),
        );
      }
      const validBlocks = blocks.filter(({ block }) => block.parseError === null);
      if (validBlocks.length === 0) {
        findings.push(finding("jsonld-structure", "NOT_APPLICABLE", "No parseable JSON-LD to inspect.", []));
      } else {
        const types = new Set<string>();
        let withContext = 0;
        const collect = (node: unknown): void => {
          if (node === null || typeof node !== "object") return;
          if (Array.isArray(node)) {
            for (const item of node) collect(item);
            return;
          }
          const rec = node as Record<string, unknown>;
          if (typeof rec["@context"] === "string") withContext += 1;
          const t = rec["@type"];
          if (typeof t === "string") types.add(t);
          else if (Array.isArray(t)) for (const x of t) if (typeof x === "string") types.add(x);
          if ("@graph" in rec) collect(rec["@graph"]);
        };
        for (const { block } of validBlocks) collect(block.parsed);
        findings.push(
          finding("jsonld-structure", withContext === validBlocks.length && types.size > 0 ? "PASS" : "WARN",
            `Structured data detected (${[...types].slice(0, 5).join(", ") || "untyped"}). Syntax valid — this is not schema validation or rich-result eligibility.`,
            [ev(now, "html", entry?.url, { blocks: validBlocks.length, withContext, types: [...types].slice(0, 10) })]),
        );
      }
    }
  }

  // ——— 28–31. Search sources (lab performance now evidence-based) ———
  findings.push(finding("rich-results", "NOT_ASSESSED",
    "Rich-result eligibility not assessed — no schema validator connected. JSON-LD presence alone does not imply eligibility.",
    [ev(now, "rich_results", entry?.url, { connected: false }, "No validator queried.")]));
  findings.push(evaluatePerformanceLab(input));
  findings.push(finding("performance-field", "NOT_ASSESSED",
    "Field performance not measured — no Chrome UX Report integration (no LCP, INP, CLS field data).",
    [ev(now, "crux", entry?.url, { connected: false }, "No field data queried.")]));
  findings.push(finding("gsc-indexing", "NOT_ASSESSED",
    "Google indexing status unknown — no Search Console connection (no impressions, clicks, CTR, or average position).",
    [ev(now, "gsc", entry?.url, { connected: false }, "No Search Console data queried.")]));

  // ——— 32–35. Unconnected authority sources ———
  findings.push(finding("backlinks", "NOT_ASSESSED",
    "Backlink profile unknown — outbound links found in HTML are not backlinks and no backlink source is connected.",
    [ev(now, "html", entry?.url, { connected: false }, "A backlink requires another site linking to this site.")]));
  findings.push(finding("domain-authority", "NOT_ASSESSED",
    "Domain Authority / Rating not assessed — third-party metrics are never manufactured from on-page HTML.",
    []));
  findings.push(finding("rankings", "NOT_ASSESSED",
    "Keyword rankings unknown — rankings and traffic are never invented without a connected data source.",
    []));
  findings.push(finding("gbp-verified", "NOT_ASSESSED",
    "Google Business Profile status unknown — GBP performance, reviews, and visibility require a connected GBP source. Website NAP signals are measured separately.",
    [ev(now, "gbp", entry?.url, { connected: false }, "No GBP source queried.")]));

  // ——— 36. NAP observed (website signals only) ———
  if (!entry) {
    findings.push(finding("nap-observed", "NOT_ASSESSED", "No pages analysed.", []));
  } else {
    const signals: Record<string, boolean> = {
      phone: pages.some((p) => p.phone !== null),
      email: pages.some((p) => p.email !== null),
      addressText: pages.some((p) => p.addressText !== null),
      localBusinessJsonLd: pages.some((p) =>
        p.jsonLd.some((b) => JSON.stringify(b.parsed ?? {}).includes("LocalBusiness")),
      ),
      organizationJsonLd: pages.some((p) =>
        p.jsonLd.some((b) => JSON.stringify(b.parsed ?? {}).includes("Organization")),
      ),
    };
    const count = Object.values(signals).filter(Boolean).length;
    findings.push(
      finding("nap-observed", count >= 2 ? "PASS" : count === 1 ? "WARN" : "FAIL",
        count > 0
          ? `${count} business signal${count === 1 ? "" : "s"} observed on the website (not GBP-verified).`
          : "No business name/phone/email/address signals observed on analysed pages.",
        [ev(now, "html", entry.url, {
          ...signals,
          phone: pages.map((p) => p.phone).find(Boolean) ?? null,
          email: pages.map((p) => p.email).find(Boolean) ?? null,
        }, "Observed on website — distinct from Verified in Google Business Profile.")],
        count < 2 ? "Recommendation: publish consistent business name, phone, email, and address text on the site." : undefined),
    );
  }

  return findings;
}
