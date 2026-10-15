/**
 * Site-wide pagination settings, driven by environment variables.
 *
 * Read at call time (never baked into module scope) so flips take effect
 * on the next request / ISR regeneration without a redeploy — the same
 * pattern as `MOGEN_ALLOW_FALLBACK_FEATURING` in `data/promotions.ts`.
 * Server-only: never expose these as `NEXT_PUBLIC_` (they shape
 * server-rendered listings, and page size can leak catalog sizing).
 *
 * - `PAGINATION_PAGE_SIZE` — items per page, positive integer (default 12).
 *   A single section may override it with `PAGINATION_<SECTION>_PAGE_SIZE`
 *   (e.g. `PAGINATION_ARTICLES_PAGE_SIZE`); layout and boundary behaviour
 *   stay global so the whole site keeps one pagination design language.
 * - `PAGINATION_STYLE` — `condensed` (default) keeps every control in one
 *   centred row; `justified` spreads the three groups — (First, Previous),
 *   page numbers, (Next, Last) — across the full row width.
 * - `PAGINATION_ENDS` — how the boundary controls behave at the ends.
 *   `disabled` (default) always renders First/Previous/Next/Last and shows
 *   the unreachable ones as disabled (layout-stable, familiar).
 *   `smart` omits controls that would go nowhere instead (compact).
 *   Anything else falls back to the default in both cases.
 */

/** Fallback items-per-page when no valid env value is set. */
export const DEFAULT_PAGINATION_PAGE_SIZE = 12;

/** Row layout for a pagination control. */
export type PaginationStyle = "condensed" | "justified";

/** Behaviour of the First/Previous/Next/Last boundary controls. */
export type PaginationEnds = "disabled" | "smart";

export interface PaginationSettings {
  pageSize: number;
  style: PaginationStyle;
  ends: PaginationEnds;
}

function parsePageSize(
  raw: string | undefined,
  fallback: number = DEFAULT_PAGINATION_PAGE_SIZE,
): number {
  if (raw === undefined) return fallback;
  const trimmed = raw.trim();
  if (!/^\d+$/.test(trimmed)) return fallback;
  const n = Number.parseInt(trimmed, 10);
  return Number.isSafeInteger(n) && n > 0 ? n : fallback;
}

function parseStyle(raw: string | undefined): PaginationStyle {
  return raw?.trim().toLowerCase() === "justified" ? "justified" : "condensed";
}

function parseEnds(raw: string | undefined): PaginationEnds {
  return raw?.trim().toLowerCase() === "smart" ? "smart" : "disabled";
}

/**
 * Resolve the effective pagination settings. `section` enables the
 * per-section page-size override (`PAGINATION_<SECTION>_PAGE_SIZE`,
 * e.g. section `"articles"` → `PAGINATION_ARTICLES_PAGE_SIZE`);
 * style and ends are always global.
 */
export function getPaginationSettings(
  env: Record<string, string | undefined> = process.env,
  section?: string,
): PaginationSettings {
  const globalSize = parsePageSize(env.PAGINATION_PAGE_SIZE);
  const sectionKey =
    section !== undefined
      ? env[`PAGINATION_${section.trim().toUpperCase()}_PAGE_SIZE`]
      : undefined;
  return {
    pageSize: parsePageSize(sectionKey, globalSize),
    style: parseStyle(env.PAGINATION_STYLE),
    ends: parseEnds(env.PAGINATION_ENDS),
  };
}
