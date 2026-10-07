/**
 * Server-side PDF rendering for the SEO analyser (jsPDF, text-based).
 *
 * Two documents:
 * - Client report: simple plain-English strengths only. Never contains
 *   failures, warnings, or a poor numeric score.
 * - Technical report: the full measurement record for Mogen's inbox.
 */

import { jsPDF } from "jspdf";
import type { AuditResult } from "./types";
import { QUADRANT_LABELS, RULE_MAP } from "./types";
import {
  INP_LAB_UNAVAILABLE_SHORT,
  type PageSpeedEvidence,
} from "./pagespeed";
import {
  buildClientReport,
  GOOD_SCORE_THRESHOLD,
} from "./report-client";

const PAGE_WIDTH = 210;
const MARGIN = 18;
const CONTENT_WIDTH = PAGE_WIDTH - MARGIN * 2;
const BOTTOM = 282;

function baseDoc(): jsPDF {
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  doc.setFont("helvetica", "normal");
  return doc;
}

class Writer {
  y = 22;
  constructor(readonly doc: jsPDF) {}

  ensureSpace(needed: number): void {
    if (this.y + needed > BOTTOM) {
      this.doc.addPage();
      this.y = 22;
    }
  }

  title(text: string): void {
    this.doc.setFont("helvetica", "bold");
    this.doc.setFontSize(22);
    this.doc.setTextColor(20, 20, 20);
    const lines = this.doc.splitTextToSize(text, CONTENT_WIDTH);
    this.ensureSpace(lines.length * 9 + 4);
    this.doc.text(lines, MARGIN, this.y);
    this.y += lines.length * 9 + 2;
  }

  subtitle(text: string): void {
    this.doc.setFont("helvetica", "normal");
    this.doc.setFontSize(11);
    this.doc.setTextColor(90, 90, 90);
    const lines = this.doc.splitTextToSize(text, CONTENT_WIDTH);
    this.ensureSpace(lines.length * 6);
    this.doc.text(lines, MARGIN, this.y);
    this.y += lines.length * 6 + 4;
  }

  h2(text: string): void {
    this.ensureSpace(14);
    this.y += 4;
    this.doc.setFont("helvetica", "bold");
    this.doc.setFontSize(13);
    this.doc.setTextColor(20, 20, 20);
    this.doc.text(text, MARGIN, this.y);
    this.y += 7;
  }

  para(text: string): void {
    this.doc.setFont("helvetica", "normal");
    this.doc.setFontSize(10.5);
    this.doc.setTextColor(40, 40, 40);
    const lines = this.doc.splitTextToSize(text, CONTENT_WIDTH) as string[];
    for (const line of lines) {
      this.ensureSpace(6);
      this.doc.text(line, MARGIN, this.y);
      this.y += 5.5;
    }
    this.y += 2.5;
  }

  bullets(items: string[]): void {
    this.doc.setFontSize(10.5);
    for (const item of items) {
      this.doc.setFont("helvetica", "normal");
      this.doc.setTextColor(40, 40, 40);
      const lines = this.doc.splitTextToSize(item, CONTENT_WIDTH - 6) as string[];
      this.ensureSpace(lines.length * 5.5 + 2);
      this.doc.text("•", MARGIN, this.y);
      this.doc.text(lines, MARGIN + 6, this.y);
      this.y += lines.length * 5.5 + 2;
    }
    this.y += 2;
  }

  numbered(headline: string, detail: string, index: number): void {
    this.ensureSpace(16);
    this.doc.setFont("helvetica", "bold");
    this.doc.setFontSize(11);
    this.doc.setTextColor(20, 20, 20);
    const head = this.doc.splitTextToSize(`${index}. ${headline}`, CONTENT_WIDTH) as string[];
    this.ensureSpace(head.length * 6);
    this.doc.text(head, MARGIN, this.y);
    this.y += head.length * 6;
    this.doc.setFont("helvetica", "normal");
    this.doc.setFontSize(10.5);
    this.doc.setTextColor(60, 60, 60);
    const body = this.doc.splitTextToSize(detail, CONTENT_WIDTH) as string[];
    for (const line of body) {
      this.ensureSpace(6);
      this.doc.text(line, MARGIN, this.y);
      this.y += 5.5;
    }
    this.y += 3;
  }

  kv(label: string, value: string): void {
    this.doc.setFontSize(10.5);
    const text = `${label}: ${value}`;
    const lines = this.doc.splitTextToSize(text, CONTENT_WIDTH) as string[];
    this.ensureSpace(lines.length * 5.5 + 1);
    this.doc.setFont("helvetica", "bold");
    this.doc.setTextColor(20, 20, 20);
    const labelWidth = this.doc.getTextWidth(`${label}: `);
    this.doc.text(`${label}: `, MARGIN, this.y);
    this.doc.setFont("helvetica", "normal");
    this.doc.setTextColor(40, 40, 40);
    if (labelWidth < CONTENT_WIDTH - 20) {
      const rest = this.doc.splitTextToSize(value, CONTENT_WIDTH - labelWidth) as string[];
      this.doc.text(rest, MARGIN + labelWidth, this.y);
      this.y += rest.length * 5.5 + 1;
    } else {
      this.y += 5.5;
      for (const line of this.doc.splitTextToSize(value, CONTENT_WIDTH) as string[]) {
        this.ensureSpace(6);
        this.doc.text(line, MARGIN, this.y);
        this.y += 5.5;
      }
      this.y += 1;
    }
  }

  finish(footerLeft: string): Buffer {
    const total = this.doc.getNumberOfPages();
    for (let i = 1; i <= total; i += 1) {
      this.doc.setPage(i);
      this.doc.setFont("helvetica", "normal");
      this.doc.setFontSize(8);
      this.doc.setTextColor(130, 130, 130);
      this.doc.text(footerLeft, MARGIN, 290);
      this.doc.text(`Page ${i} of ${total}`, PAGE_WIDTH - MARGIN, 290, { align: "right" });
    }
    return Buffer.from(this.doc.output("arraybuffer"));
  }
}

function scoreBand(score: number): string {
  if (score >= 90) return "Excellent. Your website measures strongly across everything we could directly observe.";
  if (score >= 80) return "Strong. Your website measures well, with clear room to polish further.";
  return "Good. Your website has solid foundations, and focused improvements can take it further.";
}

/** Client PDF: plain-English strengths only. Never failures, never a poor score. */
export function renderClientPdf(audit: AuditResult): Buffer {
  const model = buildClientReport(audit);
  const w = new Writer(baseDoc());
  w.title("Your Website Growth Report");
  w.subtitle(`${model.domain} — prepared ${model.generatedAt.slice(0, 10)} by Mogen`);

  if (model.scoreShown && model.score !== null) {
    w.h2(`Your website scored ${model.score} out of 100`);
    w.para(scoreBand(model.score));
    w.para(
      `This score reflects ${audit.summary.assessed} of ${audit.summary.applicable} checks ` +
        `we could directly measure on your public website. Where we had no connected data ` +
        `(for example rankings, traffic or reviews), we marked the check as not assessed ` +
        `rather than guessing.`,
    );
  } else {
    w.h2("Your website has solid foundations");
    w.para(
      "This report focuses on what we could verify is already working well on your website. " +
        "It intentionally leaves out anything we could not measure fairly — we would rather " +
        "show you verified strengths than guess at numbers.",
    );
  }

  w.h2("What we found working well");
  if (model.strengths.length === 0) {
    w.para("Our checks are still gathering the full picture — a Mogen strategist will walk you through the detail.");
  } else {
    model.strengths.forEach((s, i) => w.numbered(s.headline, s.detail, i + 1));
  }

  w.h2("How this was measured");
  w.para(
    `We fetched ${model.pagesAnalysed} page${model.pagesAnalysed === 1 ? "" : "s"} of your public ` +
      `website (${model.finalUrl}) and directly measured titles, descriptions, headings, images, ` +
      `links, social previews, structured data, robots.txt and your sitemap. Rankings, traffic, ` +
      `backlinks and Google data are never invented — they are only reported when the source is connected.`,
  );

  w.h2("Next steps");
  w.para(
    "If you would like the full prioritised blueprint — including anything that needs attention — " +
      "reply to our email or book a strategy call. Every item in it traces back to an actual " +
      "measurement on your site, so you will always see the evidence behind a recommendation.",
  );
  w.para("Mogen — info@mogen.co.za");

  return w.finish("Mogen SEO Growth Audit — measured, never invented");
}

export interface TechnicalPdfMeta {
  ip?: string;
  lead?: {
    name?: string;
    email?: string;
    phone?: string;
    business?: string;
    service?: string;
  };
}

function truncateJson(value: unknown, max = 800): string {
  const raw = JSON.stringify(value);
  return raw.length > max ? `${raw.slice(0, max)}…` : raw;
}

function formatMs(value: number | null): string {
  if (value === null) return "not assessed";
  if (value >= 1000) return `${(value / 1000).toFixed(1)} s`;
  return `${Math.round(value)} ms`;
}

function formatCls(value: number | null): string {
  if (value === null) return "not assessed";
  return value.toFixed(2);
}

function formatCategoryScore(score: number | null): string {
  if (score === null) return "not assessed";
  return `${Math.round(score * 100)} / 100`;
}

function renderPsiStrategy(
  w: InstanceType<typeof Writer>,
  label: string,
  strat: PageSpeedEvidence | null,
  reason: string | null,
): void {
  w.para(label);
  if (!strat) {
    w.para(`${label.split(" ")[0]}: unavailable — ${reason ?? "Lighthouse data unavailable"}`);
    return;
  }
  if (strat.version) w.kv("Lighthouse version", strat.version);
  w.kv("Performance", formatCategoryScore(strat.categories.performance));
  w.kv("Accessibility", formatCategoryScore(strat.categories.accessibility));
  w.kv("Best practices", formatCategoryScore(strat.categories.bestPractices));
  w.kv("SEO (Lighthouse evidence only)", formatCategoryScore(strat.categories.seo));
  const m = strat.metrics;
  w.kv("LCP", formatMs(m.lcpMs));
  w.kv("FCP", formatMs(m.fcpMs));
  w.kv("CLS", formatCls(m.cls));
  w.kv("TBT", formatMs(m.totalBlockingTimeMs));
  w.kv("Speed Index", formatMs(m.speedIndexMs));
  w.kv("TTFB", formatMs(m.ttfbMs));
  w.kv(
    "INP",
    m.inpMs === null ? INP_LAB_UNAVAILABLE_SHORT : formatMs(m.inpMs),
  );
}

/** Lighthouse / PageSpeed Insights section for the technical report. */
function renderPsiSection(
  w: InstanceType<typeof Writer>,
  audit: AuditResult,
): void {
  w.h2("Lighthouse / PageSpeed Insights");
  const psi = audit.psi ?? null;
  const lab = audit.findings.find((f) => f.ruleId === "performance-lab");
  if (!psi || (!psi.mobile && !psi.desktop)) {
    w.para("Lighthouse / performance: NOT_ASSESSED");
    w.para(
      lab?.summary ??
        "Lighthouse lab data unavailable — performance was not inferred from HTML.",
    );
    w.para("Lighthouse / PageSpeed Insights — lab analysis: no usable data returned.");
    return;
  }
  w.kv("Source", "Google PageSpeed Insights");
  w.kv("Analysed URL", psi.url);
  w.kv("Generated", psi.fetchedAt);
  renderPsiStrategy(w, "Mobile lab analysis", psi.mobile, psi.mobileReason);
  renderPsiStrategy(w, "Desktop lab analysis", psi.desktop, psi.desktopReason);
  w.para(
    "Note: Lighthouse metrics are synthetic lab measurements, not real-user data. " +
      "INP is a field (real-user) metric and is never manufactured from TBT — " +
      "TBT is the Lighthouse lab responsiveness metric. Real-user INP requires " +
      "field data such as Chrome UX Report (CrUX), which is not connected.",
  );
  w.para(
    "Note: the Lighthouse SEO category is supporting evidence only. " +
      "The Mogen SEO score remains the canonical score.",
  );
}

/** Technical PDF: the complete measurement record for Mogen's inbox. */
export function renderTechnicalPdf(audit: AuditResult, meta: TechnicalPdfMeta = {}): Buffer {
  const w = new Writer(baseDoc());
  w.title("SEO Technical Audit Report");
  w.subtitle(`${audit.site.domain} — ${audit.generatedAt} (engine ${audit.engineVersion}, rules ${audit.ruleSetVersion})`);

  w.h2("Request");
  w.kv("Submitted URL", audit.site.submittedUrl);
  w.kv("Final URL", audit.site.finalUrl);
  if (meta.ip) w.kv("Visitor IP", meta.ip);
  if (meta.lead) {
    if (meta.lead.name) w.kv("Name", meta.lead.name);
    if (meta.lead.email) w.kv("Email", meta.lead.email);
    if (meta.lead.phone) w.kv("Phone", meta.lead.phone);
    if (meta.lead.business) w.kv("Business", meta.lead.business);
    if (meta.lead.service) w.kv("Service interest", meta.lead.service);
  }

  w.h2("Crawl");
  w.kv("Pages requested", String(audit.crawl.pagesRequested));
  w.kv("Pages analysed", String(audit.crawl.pagesAnalysed));
  if (audit.crawl.redirects.length > 0) {
    w.bullets(audit.crawl.redirects.map((r) => `${r.status} — ${r.url}`));
  }
  w.bullets(audit.crawl.analysedUrls.slice(0, 10).map((u) => `Analysed: ${u}`));

  w.h2("robots.txt");
  w.kv("URL", audit.robots.url);
  w.kv("HTTP status", String(audit.robots.status ?? "unreachable"));
  w.kv("Disallow rules", audit.robots.disallowRules.join(" | ") || "none");
  w.kv("Sitemap refs", audit.robots.sitemapRefs.join(" | ") || "none");
  w.kv("llms.txt detected", String(audit.robots.llmsTxtDetected));

  w.h2("Sitemap");
  w.kv("URL", audit.sitemap.url ?? "none discovered");
  w.kv("HTTP status", String(audit.sitemap.status ?? "n/a"));
  w.kv("Valid XML", String(audit.sitemap.validXml));
  w.kv("Kind", audit.sitemap.kind);
  w.kv("Discovered URLs", String(audit.sitemap.discoveredUrls.length));
  w.kv("Invalid entries", String(audit.sitemap.invalidEntries));
  w.kv("Duplicate URLs", String(audit.sitemap.duplicateUrls));
  w.kv("Off-origin URLs", String(audit.sitemap.offOriginUrls));

  renderPsiSection(w, audit);

  w.h2("Summary");
  const s = audit.summary;
  w.kv("Score", s.score === null ? "n/a (insufficient coverage)" : `${s.score} / 100${s.provisional ? " (provisional)" : ""}`);
  w.kv("Coverage", `${Math.round(s.coverage * 100)}% (${s.assessed}/${s.applicable} assessed)`);
  w.kv("Passed / Warnings / Failed / Not assessed", `${s.passed} / ${s.warnings} / ${s.failed} / ${s.notAssessed}`);

  w.h2("Quadrants");
  for (const q of audit.quadrants) {
    w.kv(
      QUADRANT_LABELS[q.id] ?? q.id,
      q.score === null ? `not assessed (${q.assessed}/${q.applicable})` : `${q.score} / 100 (${q.assessed}/${q.applicable})`,
    );
  }

  w.h2(`Findings (${audit.findings.length})`);
  for (const f of audit.findings) {
    const rule = RULE_MAP.get(f.ruleId);
    w.ensureSpace(20);
    w.doc.setFont("helvetica", "bold");
    w.doc.setFontSize(11);
    w.doc.setTextColor(20, 20, 20);
    w.doc.text(`[${f.status}] ${rule?.label ?? f.ruleId}`, MARGIN, w.y);
    w.y += 6;
    w.para(f.summary);
    if (f.recommendation) w.para(f.recommendation);
    if (f.evidence.length > 0) {
      w.doc.setFont("courier", "normal");
      w.doc.setFontSize(8);
      w.doc.setTextColor(80, 80, 80);
      for (const item of f.evidence.slice(0, 6)) {
        const text = truncateJson(
          { source: item.source, url: item.url, value: item.value, details: item.details },
          500,
        );
        const lines = w.doc.splitTextToSize(text, CONTENT_WIDTH) as string[];
        for (const line of lines.slice(0, 8)) {
          w.ensureSpace(5);
          w.doc.text(line, MARGIN, w.y);
          w.y += 4.2;
        }
      }
      w.y += 3;
    }
  }

  return w.finish(`Mogen internal technical report — audit ${audit.id}`);
}

/** Client PDF filename for attachments and downloads. */
export function clientPdfFilename(domain: string): string {
  const safe = domain.toLowerCase().replace(/[^a-z0-9.-]+/g, "-");
  return `mogen-growth-report-${safe}.pdf`;
}

/** Technical PDF filename for inbox attachments. */
export function technicalPdfFilename(domain: string, when = new Date()): string {
  const safe = domain.toLowerCase().replace(/[^a-z0-9.-]+/g, "-");
  const stamp = when.toISOString().slice(0, 10);
  return `mogen-technical-audit-${safe}-${stamp}.pdf`;
}

export { GOOD_SCORE_THRESHOLD };
