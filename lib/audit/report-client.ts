/**
 * Client-facing report model.
 *
 * Rules:
 * - Only directly measured PASS findings appear, translated to plain English.
 * - WARN / FAIL findings are NEVER included (no bad scores in the client report).
 * - The numeric score appears ONLY when it is good (>= threshold). A poor or
 *   missing score is omitted entirely — the report focuses on verified strengths.
 * - Nothing is invented: every strength traces to a measured finding.
 */

import type { AuditResult, Finding } from "./types";
import { RULE_MAP } from "./types";

/** Minimum score that may be shown to the client. */
export const GOOD_SCORE_THRESHOLD = 70;

export interface ClientStrength {
  ruleId: string;
  headline: string;
  detail: string;
}

export interface ClientReportModel {
  domain: string;
  finalUrl: string;
  generatedAt: string;
  score: number | null;
  /** True only when the score is good enough to show. */
  scoreShown: boolean;
  pagesAnalysed: number;
  strengths: ClientStrength[];
}

/**
 * Plain-English positive copy per measurable rule. Each entry describes what
 * was actually observed — never a ranking claim.
 */
const POSITIVE_COPY: Record<string, { headline: string; detail: string }> = {
  https: {
    headline: "Secure connection",
    detail: "Your website loads over a secure (HTTPS) connection, which protects visitors and is the expected standard.",
  },
  "redirect-chain": {
    headline: "Clean address handling",
    detail: "Visitors reach your pages directly without long chains of redirects.",
  },
  "robots-txt": {
    headline: "Search-engine instructions in place",
    detail: "Your site publishes a robots.txt file that guides search engines on what to crawl.",
  },
  "sitemap-present": {
    headline: "Site map available",
    detail: "A sitemap was found, which helps search engines discover your pages.",
  },
  "sitemap-valid": {
    headline: "Site map in good shape",
    detail: "Your sitemap is valid and lists your pages cleanly.",
  },
  "canonical-present": {
    headline: "Page addresses clearly marked",
    detail: "Your pages declare their preferred (canonical) addresses, which helps search engines index the right URLs.",
  },
  "canonical-target": {
    headline: "Page addresses resolve",
    detail: "The preferred addresses on your pages were checked and they load correctly.",
  },
  viewport: {
    headline: "Mobile-friendly setup",
    detail: "Your pages declare a mobile viewport, so they adapt to phone screens.",
  },
  "html-lang": {
    headline: "Language declared",
    detail: "Your pages declare their language, which helps search engines and screen readers.",
  },
  charset: {
    headline: "Text encoding declared",
    detail: "Your pages declare their text encoding, so content displays correctly.",
  },
  "robots-meta": {
    headline: "No accidental blocking",
    detail: "None of the analysed pages tell search engines to stay away.",
  },
  "title-present": {
    headline: "Page titles in place",
    detail: "Your pages have titles — the text shown in browser tabs and search results.",
  },
  "title-length": {
    headline: "Well-sized titles",
    detail: "Your page titles fall within a length that displays well in search results.",
  },
  "meta-description-present": {
    headline: "Page summaries in place",
    detail: "Your pages include descriptions — the short summaries search engines can show under your links.",
  },
  "meta-description-length": {
    headline: "Well-sized summaries",
    detail: "Your page descriptions fall within a length that displays well in search results.",
  },
  h1: {
    headline: "Clear page headings",
    detail: "Each analysed page uses one main heading, which structures the content clearly.",
  },
  "heading-order": {
    headline: "Logical heading structure",
    detail: "Headings follow a logical order without skipped levels.",
  },
  "images-alt": {
    headline: "Descriptive images",
    detail: "Your images carry text descriptions, which help visually impaired visitors and search engines.",
  },
  "images-dimensions": {
    headline: "Stable image layout",
    detail: "Your images declare their sizes, which keeps page layout stable while loading.",
  },
  "content-volume": {
    headline: "Substantive page content",
    detail: "Your pages carry a healthy amount of readable copy for visitors.",
  },
  "duplicate-content": {
    headline: "Unique page content",
    detail: "The pages we compared each carry their own distinct content.",
  },
  "internal-linking": {
    headline: "Pages link together",
    detail: "Your pages link to each other, helping visitors (and search engines) find their way around.",
  },
  "external-link-attrs": {
    headline: "Tidy outbound links",
    detail: "Links to other websites on your pages are correctly marked.",
  },
  "faq-content": {
    headline: "Helpful Q&A content",
    detail: "Your site includes questions-and-answers content that helps visitors directly.",
  },
  "og-tags": {
    headline: "Social sharing ready",
    detail: "Your pages include preview titles, descriptions and images for sharing on social media.",
  },
  "twitter-tags": {
    headline: "Social cards ready",
    detail: "Your pages include card tags so links look good when shared.",
  },
  "jsonld-syntax": {
    headline: "Machine-readable data present",
    detail: "Your pages include structured data that machines can read and understand.",
  },
  "jsonld-structure": {
    headline: "Structured business data",
    detail: "Your structured data identifies your business content with recognised types.",
  },
  "nap-observed": {
    headline: "Contact details visible",
    detail: "Your business contact signals (phone, email, address) are visible on your website.",
  },
};

function toStrength(finding: Finding): ClientStrength | null {
  if (finding.status !== "PASS") return null;
  const copy = POSITIVE_COPY[finding.ruleId];
  if (!copy) return null;
  if (!RULE_MAP.get(finding.ruleId)) return null;
  return { ruleId: finding.ruleId, headline: copy.headline, detail: copy.detail };
}

export function buildClientReport(audit: AuditResult): ClientReportModel {
  const strengths: ClientStrength[] = [];
  for (const finding of audit.findings) {
    const strength = toStrength(finding);
    if (strength) strengths.push(strength);
  }
  const score = audit.summary.score;
  return {
    domain: audit.site.domain,
    finalUrl: audit.site.finalUrl,
    generatedAt: audit.generatedAt,
    score,
    scoreShown: score !== null && score >= GOOD_SCORE_THRESHOLD,
    pagesAnalysed: audit.crawl.pagesAnalysed,
    strengths,
  };
}
