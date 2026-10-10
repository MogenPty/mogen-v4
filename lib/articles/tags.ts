import type { ArticleSummary } from "./types";

/**
 * Canonical tag helpers (single source of truth for tag URLs).
 *
 * - `slugifyTag()` maps a display label ("Web Development") to a stable
 *   URL slug ("web-development"): lowercase, trimmed, runs of
 *   non-alphanumeric characters collapsed to a single hyphen.
 * - The original label is always preserved for display; only the slug
 *   appears in URLs (`/articles/tag/<slug>`).
 * - Labels that normalise to the same slug (e.g. "SEO" vs "seo") share
 *   ONE archive: articles are merged under that slug and the display
 *   label is the most frequently used variant (first-seen tiebreak).
 *   Collisions are reported via `tagLabelCollisions()` instead of
 *   producing duplicate archives.
 */

export function slugifyTag(label: string): string {
  return label
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

export function tagArchivePath(slug: string): string {
  return `/articles/tag/${encodeURIComponent(slug)}`;
}

export interface TagArchive {
  /** Stable URL slug. */
  slug: string;
  /** Display label (most common variant; original casing preserved). */
  label: string;
  /** All labels observed mapping to this slug (for collision reporting). */
  labels: string[];
  articles: ArticleSummary[];
}

/**
 * Group published article summaries by tag slug. Input MUST be the
 * canonical published list (drafts/scheduled already excluded by the
 * loader) so archives never leak unpublished articles.
 */
export function getTagArchives(
  articles: ArticleSummary[],
): Map<string, TagArchive> {
  const archives = new Map<string, TagArchive>();
  for (const article of articles) {
    for (const label of article.tags) {
      const slug = slugifyTag(label);
      if (!slug) continue;
      const existing = archives.get(slug);
      if (existing) {
        if (!existing.articles.some((a) => a.slug === article.slug)) {
          existing.articles.push(article);
        }
        if (!existing.labels.includes(label)) existing.labels.push(label);
      } else {
        archives.set(slug, {
          slug,
          label,
          labels: [label],
          articles: [article],
        });
      }
    }
  }
  // Newest-first within each archive (publishedAt desc, slug tiebreak).
  for (const archive of archives.values()) {
    archive.articles.sort((a, b) => {
      if (a.publishedAt !== b.publishedAt) {
        return a.publishedAt < b.publishedAt ? 1 : -1;
      }
      return a.slug.localeCompare(b.slug);
    });
    // Display label = most frequently used variant (first-seen tiebreak).
    const counts = new Map<string, number>();
    for (const article of archive.articles) {
      for (const t of article.tags) {
        if (slugifyTag(t) === archive.slug) {
          counts.set(t, (counts.get(t) ?? 0) + 1);
        }
      }
    }
    let best = archive.label;
    let bestCount = -1;
    for (const [t, n] of counts) {
      if (n > bestCount) {
        best = t;
        bestCount = n;
      }
    }
    archive.label = best;
  }
  return archives;
}

/** Slugs where ≥2 distinct labels collided (explicit, testable). */
export function tagLabelCollisions(
  articles: ArticleSummary[],
): { slug: string; labels: string[] }[] {
  const out: { slug: string; labels: string[] }[] = [];
  for (const archive of getTagArchives(articles).values()) {
    if (archive.labels.length > 1) {
      out.push({ slug: archive.slug, labels: [...archive.labels] });
    }
  }
  return out;
}

/** Articles for one tag slug (empty array when the tag is unknown). */
export function getArticlesByTag(
  articles: ArticleSummary[],
  tagSlug: string,
): ArticleSummary[] {
  return getTagArchives(articles).get(tagSlug)?.articles ?? [];
}
