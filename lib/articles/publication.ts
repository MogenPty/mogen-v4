import type { ArticleMeta } from "./types";

/**
 * Canonical article publication rules (single source of truth).
 *
 * An article is publicly published only if:
 * - it is not marked as a draft (`draft: true` hides it), AND
 * - its publication date has arrived.
 *
 * Date format + timezone (explicit, documented):
 * - `publishedAt` / `updatedAt` are calendar dates in `YYYY-MM-DD` form.
 * - They are interpreted as midnight at the START of that date in the
 *   `Africa/Johannesburg` timezone (SAST, UTC+2, no daylight saving).
 * - As UTC milliseconds: `Date.UTC(y, m - 1, d) - 2 * 3600_000`.
 * - Parsing uses integer components only — never `new Date("YYYY-MM-DD")`
 *   or locale-dependent parsing — so browser, server and UTC behaviour
 *   agree deterministically.
 *
 * Compatibility rule for missing dates:
 * - `publishedAt` remains REQUIRED frontmatter. A file without a valid
 *   `publishedAt` fails validation loudly at load time (never silently
 *   hidden, never silently shown). All existing articles carry valid
 *   `publishedAt` dates, so none are hidden by this rule.
 *
 * Every public consumer (article index, related articles, tag archives,
 * public loaders/APIs, sitemap, detail route + metadata) MUST use
 * `isArticlePublished()` / the default loader filtering below so they
 * agree on eligibility. No independent scanners.
 */

/** Publication timezone (IANA). SAST is UTC+2 year-round (no DST). */
export const PUBLICATION_TIMEZONE = "Africa/Johannesburg";

/** Offset of Africa/Johannesburg from UTC in milliseconds (+02:00). */
export const PUBLICATION_TZ_OFFSET_MS = 2 * 3600_000;

/**
 * UTC timestamp (ms) at which a `YYYY-MM-DD` publication date becomes
 * eligible: midnight SAST on that date.
 */
export function publicationStartUtcMs(publishedAt: string): number {
  const [y, m, d] = publishedAt.split("-").map(Number);
  return Date.UTC(y, m - 1, d) - PUBLICATION_TZ_OFFSET_MS;
}

/**
 * Has the publication date arrived? `nowMs` defaults to `Date.now()`.
 * Pass an explicit `nowMs` in tests for deterministic boundary checks.
 */
export function isPublishedByDate(
  publishedAt: string,
  nowMs: number = Date.now(),
): boolean {
  return nowMs >= publicationStartUtcMs(publishedAt);
}

/**
 * Full publication eligibility: not a draft AND the publication date
 * has arrived. `nowMs` defaults to `Date.now()`.
 */
export function isArticlePublished(
  meta: Pick<ArticleMeta, "draft" | "publishedAt">,
  nowMs: number = Date.now(),
): boolean {
  if (meta.draft === true) return false;
  return isPublishedByDate(meta.publishedAt, nowMs);
}
