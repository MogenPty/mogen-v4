import { getAllArticles, type LoadArticlesOptions } from "./loader";
import type { ArticleSummary } from "./types";
import { ARTICLE_SERVICE_SLUGS } from "./types";

/**
 * Canonical related-article selection for service pages.
 *
 * Data-driven: associations come from each article's explicit `services`
 * frontmatter (stable service slugs). Articles WITHOUT explicit
 * `services` fall back to keyword inference from tags/category (see
 * `SERVICE_KEYWORDS`) so existing articles keep working without a
 * frontmatter migration. No hardcoded article slugs anywhere.
 *
 * Selection rules (in order):
 * 1. Only eligible published articles (drafts + scheduled excluded via
 *    the canonical loader).
 * 2. A featured article relevant to the service comes first.
 * 3. Remaining positions fill with the latest relevant articles.
 * 4. Never the same article twice.
 * 5. Unrelated articles never fill gaps: fewer than three matches means
 *    fewer cards; zero matches means an empty array (the section hides).
 */

export const RELATED_ARTICLES_MAX = 3;

/**
 * Lowercase keyword fragments mapping article tags/category text to a
 * service. Checked against each tag and the category. Deliberately
 * conservative: only well-established associations, never business claims.
 */
const SERVICE_KEYWORDS: Record<string, string[]> = {
  "web-development": [
    "web development",
    "web site",
    "website",
    "landing page",
    "web performance",
    "web design",
    "brits",
    "madibeng",
  ],
  seo: [
    "seo",
    "local seo",
    "google business profile",
    "google search",
    "search console",
    "keyword research",
    "core web vitals",
    "map pack",
  ],
  "digital-marketing": [
    "digital marketing",
    "conversion",
    "lead",
    "campaign",
    "social media",
    "content marketing",
  ],
  "business-documentation": [
    "business documentation",
    "policy",
    "procedure",
    "sop",
    "compliance document",
  ],
};

function haystackFor(article: ArticleSummary): string[] {
  return [
    article.category,
    ...article.tags,
  ].map((s) => s.toLowerCase());
}

/** Services inferred from tags/category (fallback when no explicit field). */
export function inferArticleServices(article: ArticleSummary): string[] {
  const hay = haystackFor(article);
  const matched: string[] = [];
  for (const slug of ARTICLE_SERVICE_SLUGS as readonly string[]) {
    const keywords = SERVICE_KEYWORDS[slug] ?? [];
    if (
      keywords.some((kw) => hay.some((h) => h === kw || h.includes(kw)))
    ) {
      matched.push(slug);
    }
  }
  return matched;
}

/** Effective service associations: explicit frontmatter wins, else inference. */
export function articleServices(article: ArticleSummary): string[] {
  if (article.services.length > 0) return [...article.services];
  return inferArticleServices(article);
}

export interface RelatedOptions extends LoadArticlesOptions {
  /** Max cards. Defaults to `RELATED_ARTICLES_MAX` (3). */
  count?: number;
}

/**
 * Pure selection core: order + cap a published article list for a service.
 * Exported for deterministic unit tests (synthetic summaries); the
 * loader-backed `getRelatedArticlesForService` below delegates to it.
 */
export function selectRelatedArticles(
  articles: ArticleSummary[],
  serviceSlug: string,
  count: number = RELATED_ARTICLES_MAX,
): ArticleSummary[] {
  if (!(ARTICLE_SERVICE_SLUGS as readonly string[]).includes(serviceSlug)) {
    return [];
  }
  const relevant = articles.filter((a) =>
    articleServices(a).includes(serviceSlug),
  );
  const byNewest = (a: ArticleSummary, b: ArticleSummary) => {
    if (a.publishedAt !== b.publishedAt) {
      return a.publishedAt < b.publishedAt ? 1 : -1;
    }
    return a.slug.localeCompare(b.slug);
  };
  const featured = relevant.filter((a) => a.featured === true).sort(byNewest);
  const rest = relevant
    .filter((a) => !(featured.length > 0 && a.slug === featured[0].slug))
    .sort(byNewest);
  const ordered = [...featured.slice(0, 1), ...rest];
  const seen = new Set<string>();
  const deduped = ordered.filter((a) => {
    if (seen.has(a.slug)) return false;
    seen.add(a.slug);
    return true;
  });
  return deduped.slice(0, Math.max(0, count));
}

/**
 * Up to `count` published articles relevant to `serviceSlug`.
 * Unknown service slugs yield `[]` (section hides — never unrelated filler).
 */
export function getRelatedArticlesForService(
  serviceSlug: string,
  options?: RelatedOptions,
): ArticleSummary[] {
  const count = options?.count ?? RELATED_ARTICLES_MAX;
  return selectRelatedArticles(getAllArticles(options), serviceSlug, count);
}
