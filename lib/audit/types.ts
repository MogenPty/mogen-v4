/**
 * Mogen SEO Analyser — shared audit types.
 *
 * Scoring contract (see task spec §2–§4):
 * - PASS / FAIL / WARN participate in the numeric score.
 * - NOT_ASSESSED / NOT_APPLICABLE / HISTORICAL / INFERRED never do.
 * - Every PASS / FAIL / WARN that contributes to the score must carry
 *   at least one AuditEvidence entry tracing it to a real measurement.
 */

export type FindingStatus =
  | "PASS"
  | "FAIL"
  | "WARN"
  | "NOT_ASSESSED"
  | "NOT_APPLICABLE"
  | "HISTORICAL"
  | "INFERRED";

export type EvidenceSource =
  | "http"
  | "html"
  | "dom"
  | "robots"
  | "sitemap"
  | "psi"
  | "crux"
  | "gsc"
  | "ga4"
  | "gbp"
  | "rich_results"
  | "schema_validator"
  | "historical";

export interface AuditEvidence {
  source: EvidenceSource;
  /** ISO timestamp of the observation. */
  observedAt: string;
  url?: string;
  value?: unknown;
  expected?: unknown;
  details?: string;
}

export type QuadrantId = "technical" | "content" | "search" | "authority";

export interface RuleDefinition {
  id: string;
  quadrant: QuadrantId;
  label: string;
  /** Scoring weight. 0 = informational, never affects the score. */
  weight: number;
}

export interface Finding {
  ruleId: string;
  status: FindingStatus;
  /** Short human-readable summary of the outcome. */
  summary: string;
  evidence: AuditEvidence[];
  /** Longer guidance shown in the UI. Recommendations are labelled as such. */
  recommendation?: string;
}

export interface RedirectHop {
  url: string;
  status: number;
}

export interface CrawlInfo {
  submittedUrl: string;
  finalUrl: string;
  domain: string;
  redirects: RedirectHop[];
  pagesRequested: number;
  pagesAnalysed: number;
  analysedUrls: string[];
}

export interface RobotsInfo {
  url: string;
  status: number | null;
  contentType: string | null;
  body: string | null;
  sitemapRefs: string[];
  disallowRules: string[];
  /** llms.txt is informational only — never scored. */
  llmsTxtDetected: boolean;
}

export interface SitemapInfo {
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

export interface QuadrantScore {
  id: QuadrantId;
  label: string;
  /** Null when no assessed checks exist in the quadrant. */
  score: number | null;
  coverage: number;
  assessed: number;
  applicable: number;
}

export interface AuditSummary {
  /** Null when coverage is too low for a meaningful score. */
  score: number | null;
  /** True when the score is reported but coverage is low. */
  provisional: boolean;
  coverage: number;
  passed: number;
  warnings: number;
  failed: number;
  notAssessed: number;
  assessed: number;
  applicable: number;
}

export interface AuditResult {
  id: string;
  version: string;
  engineVersion: string;
  ruleSetVersion: string;
  generatedAt: string;
  site: {
    submittedUrl: string;
    finalUrl: string;
    domain: string;
  };
  crawl: CrawlInfo;
  robots: RobotsInfo;
  sitemap: SitemapInfo;
  summary: AuditSummary;
  quadrants: QuadrantScore[];
  findings: Finding[];
}

/** Statuses that participate in numeric scoring. */
export const SCORED_STATUSES: ReadonlySet<FindingStatus> = new Set([
  "PASS",
  "FAIL",
  "WARN",
]);

/**
 * The Mogen 37-step framework. Weights reflect relative SEO importance;
 * weight 0 marks informational rules that never affect the score.
 */
export const RULES: readonly RuleDefinition[] = [
  // ——— Technical (11) ———
  { id: "https", quadrant: "technical", label: "HTTPS available", weight: 3 },
  { id: "redirect-chain", quadrant: "technical", label: "Redirect chain", weight: 2 },
  { id: "robots-txt", quadrant: "technical", label: "robots.txt reachable", weight: 2 },
  { id: "sitemap-present", quadrant: "technical", label: "Sitemap discoverable", weight: 2 },
  { id: "sitemap-valid", quadrant: "technical", label: "Sitemap valid", weight: 2 },
  { id: "canonical-present", quadrant: "technical", label: "Canonical present", weight: 2 },
  { id: "canonical-target", quadrant: "technical", label: "Canonical target resolves", weight: 3 },
  { id: "viewport", quadrant: "technical", label: "Viewport meta", weight: 1 },
  { id: "html-lang", quadrant: "technical", label: "HTML lang attribute", weight: 1 },
  { id: "charset", quadrant: "technical", label: "Charset declared", weight: 1 },
  { id: "robots-meta", quadrant: "technical", label: "Robots meta valid", weight: 2 },
  // ——— Content (13) ———
  { id: "title-present", quadrant: "content", label: "Title present", weight: 3 },
  { id: "title-length", quadrant: "content", label: "Title length guidance", weight: 1 },
  { id: "meta-description-present", quadrant: "content", label: "Meta description present", weight: 3 },
  { id: "meta-description-length", quadrant: "content", label: "Meta description length guidance", weight: 1 },
  { id: "h1", quadrant: "content", label: "H1 usage", weight: 2 },
  { id: "heading-order", quadrant: "content", label: "Heading order", weight: 1 },
  { id: "images-alt", quadrant: "content", label: "Image alt text", weight: 3 },
  { id: "images-dimensions", quadrant: "content", label: "Image dimensions", weight: 1 },
  { id: "content-volume", quadrant: "content", label: "Content volume", weight: 2 },
  { id: "duplicate-content", quadrant: "content", label: "Duplicate content", weight: 3 },
  { id: "internal-linking", quadrant: "content", label: "Internal linking", weight: 1 },
  { id: "external-link-attrs", quadrant: "content", label: "External link attributes", weight: 1 },
  { id: "faq-content", quadrant: "content", label: "FAQ content (informational)", weight: 0 },
  // ——— Search (8) ———
  { id: "og-tags", quadrant: "search", label: "Open Graph tags", weight: 2 },
  { id: "twitter-tags", quadrant: "search", label: "Twitter card tags", weight: 1 },
  { id: "jsonld-syntax", quadrant: "search", label: "JSON-LD syntax", weight: 2 },
  { id: "jsonld-structure", quadrant: "search", label: "JSON-LD structure", weight: 1 },
  { id: "rich-results", quadrant: "search", label: "Rich-result eligibility", weight: 2 },
  { id: "performance-lab", quadrant: "search", label: "Lab performance (Lighthouse)", weight: 3 },
  { id: "performance-field", quadrant: "search", label: "Field performance (CrUX)", weight: 3 },
  { id: "gsc-indexing", quadrant: "search", label: "Google indexing status", weight: 2 },
  // ——— Authority (5) ———
  { id: "backlinks", quadrant: "authority", label: "Backlink profile", weight: 3 },
  { id: "domain-authority", quadrant: "authority", label: "Domain authority metrics", weight: 2 },
  { id: "rankings", quadrant: "authority", label: "Keyword rankings", weight: 3 },
  { id: "gbp-verified", quadrant: "authority", label: "Google Business Profile", weight: 2 },
  { id: "nap-observed", quadrant: "authority", label: "NAP signals on website", weight: 2 },
];

export const RULE_MAP: ReadonlyMap<string, RuleDefinition> = new Map(
  RULES.map((r) => [r.id, r]),
);

export const QUADRANT_LABELS: Record<QuadrantId, string> = {
  technical: "Technical SEO",
  content: "Content",
  search: "Search",
  authority: "Authority",
};

export const ENGINE_VERSION = "1.0.0";
export const RULE_SET_VERSION = "37-step-v1";
