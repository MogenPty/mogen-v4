import { type LoadArticlesOptions, loadArticles } from "@/lib/articles/loader";
import type { ArticleSummary } from "@/lib/articles/types";
import {
  DEFAULT_PAGINATION_PAGE_SIZE,
  getPaginationSettings,
  type PaginationEnds,
} from "@/lib/pagination/config";

export interface Post {
  slug: string;
  title: string;
  category: string;
  excerpt: string;
  date: string;
  updatedAt?: string;
  readTime: string;
  author: string;
  body: string;
  /** Display tags (preserved labels; slugs via `slugifyTag`). */
  tags: string[];
  /** Effective service slugs (explicit frontmatter or inference). */
  services: string[];
  /**
   * Explicit editorial flag — the latest post with `featured: true` is
   * shown in the prominent top position on /articles (page 1 only).
   * Never hardcode a slug; selection is date-ordered (see below).
   */
  featured?: boolean;
}

/**
 * Default articles per index page when no valid page-size env value is set.
 * Kept as a constant for backwards compatibility — the runtime default is
 * env-driven (see `getArticlesPageSize()`).
 */
export const ARTICLES_PAGE_SIZE = DEFAULT_PAGINATION_PAGE_SIZE;

/**
 * Effective articles page size: `PAGINATION_ARTICLES_PAGE_SIZE` wins when
 * set to a positive integer, otherwise `PAGINATION_PAGE_SIZE`, otherwise
 * the built-in default. Read at call time so `.env` flips apply without
 * a redeploy.
 */
export function getArticlesPageSize(
  env: Record<string, string | undefined> = process.env,
): number {
  return getPaginationSettings(env, "articles").pageSize;
}

function toPost(summary: ArticleSummary, body: string): Post {
  return {
    slug: summary.slug,
    title: summary.title,
    category: summary.category,
    excerpt: summary.description,
    date: summary.publishedAt ?? summary.date,
    updatedAt: summary.updatedAt ?? summary.update,
    readTime: summary.readTime,
    author: summary.author,
    body,
    tags: [...summary.tags],
    services: [...summary.services],
    ...(summary.featured ? { featured: true as const } : {}),
  };
}

/**
 * Load posts fresh from MDX frontmatter on every call.
 * The `.mdx` files in `/articles` are the source of truth — reading the
 * filesystem per call (instead of caching at module scope) is what lets
 * newly added articles appear in listings without a server restart.
 * Article counts are tiny, so this costs nothing measurable.
 *
 * Only publicly published articles are returned (drafts + scheduled
 * excluded by the canonical loader — see `lib/articles/publication.ts`).
 */
function loadPosts(
  cwd = process.cwd(),
  loaderOptions?: Omit<LoadArticlesOptions, "cwd">,
): Post[] {
  return loadArticles({ cwd, ...loaderOptions }).map((a) =>
    toPost(a.summary, a.body),
  );
}

export interface GetPostsOptions {
  cwd?: string;
  /** Forwarded to the canonical loader (tests/deterministic boundaries). */
  nowMs?: number;
  includeScheduled?: boolean;
}

/** Fresh post collection. Prefer this over `POSTS` in components. */
export function getPosts(options?: GetPostsOptions): Post[] {
  return loadPosts(options?.cwd ?? process.cwd(), {
    ...(options?.nowMs !== undefined ? { nowMs: options.nowMs } : {}),
    ...(options?.includeScheduled !== undefined
      ? { includeScheduled: options.includeScheduled }
      : {}),
  });
}

/**
 * Backwards-compatible snapshot for tests and one-off uses.
 * NOTE: evaluated once at module load — components must use `getPosts()`
 * (or the fresh defaults below) so new articles appear without restarts.
 */
export const POSTS: Post[] = loadPosts();

export const getPost = (slug: string, options?: GetPostsOptions) =>
  getPosts(options).find((p) => p.slug === slug);

/** Convert a listing `Post` back to its canonical `ArticleSummary` shape. */
export function toArticleSummary(post: Post): ArticleSummary {
  return {
    title: post.title,
    slug: post.slug,
    description: post.excerpt,
    publishedAt: post.date,
    author: post.author,
    category: post.category,
    tags: [...post.tags],
    services: [...post.services],
    featured: post.featured === true,
    draft: false,
    readTime: post.readTime,
    date: post.date,
    excerpt: post.excerpt,
  };
}

/**
 * Articles listing helpers for /articles (newest-first + featured + pagination).
 * All ordering uses the existing `date` field (YYYY-MM-DD); never array,
 * filesystem or slug order. Secondary ordering is deterministic by slug.
 */

/** Sort posts newest-first by `date`; ties broken deterministically by slug. */
export function sortPostsByDateDesc(posts: Post[]): Post[] {
  return [...posts].sort((a, b) => {
    if (a.date !== b.date) return a.date < b.date ? 1 : -1;
    return a.slug.localeCompare(b.slug);
  });
}

/** Latest explicitly featured article (newest `date` among `featured: true`). */
export function getLatestFeaturedPost(posts?: Post[]): Post | undefined {
  const all = posts ?? getPosts();
  const featured = all.filter((p) => p.featured === true);
  if (featured.length === 0) return undefined;
  return sortPostsByDateDesc(featured)[0];
}

/**
 * Normal article collection: newest-first, with the latest featured article
 * excluded so it is never duplicated below the prominent position.
 * When no featured article exists, this is simply all posts newest-first.
 */
export function getRegularPosts(posts?: Post[]): Post[] {
  const all = posts ?? getPosts();
  const featured = getLatestFeaturedPost(all);
  const sorted = sortPostsByDateDesc(all);
  if (!featured) return sorted;
  return sorted.filter((p) => p.slug !== featured.slug);
}

export interface PaginatedResult {
  items: Post[];
  totalItems: number;
  totalPages: number;
  currentPage: number;
  pageSize: number;
}

/** Safely parse a `?page=` value. Invalid → 1. */
export function parsePageParam(value: unknown): number {
  if (typeof value === "string") {
    if (!/^\d+$/.test(value.trim())) return 1;
    const n = Number.parseInt(value.trim(), 10);
    return Number.isSafeInteger(n) && n >= 1 ? n : 1;
  }
  const n = Number(value);
  if (!Number.isFinite(n) || !Number.isInteger(n) || n < 1) return 1;
  return n;
}

export interface GetArticlesOptions {
  page?: number;
  pageSize?: number;
  posts?: Post[];
}

/**
 * Data-level pagination for the normal listing.
 * IMPORTANT: the featured article is excluded BEFORE pagination so page
 * sizes stay consistent and no article goes missing.
 * The default page size is env-driven (`PAGINATION_ARTICLES_PAGE_SIZE` →
 * `PAGINATION_PAGE_SIZE` → 12); an explicit `pageSize` still wins.
 */
export function getArticles({
  page = 1,
  pageSize,
  posts,
}: GetArticlesOptions = {}): PaginatedResult {
  const fallback = getArticlesPageSize();
  const safePageSize =
    Number.isInteger(pageSize) && (pageSize as number) > 0
      ? (pageSize as number)
      : fallback;
  const regular = getRegularPosts(posts);
  const totalItems = regular.length;
  const totalPages =
    totalItems === 0 ? 0 : Math.ceil(totalItems / safePageSize);
  const currentPage =
    totalItems === 0
      ? 1
      : Math.min(Math.max(1, Math.floor(page) || 1), totalPages);
  const start = (currentPage - 1) * safePageSize;
  return {
    items: regular.slice(start, start + safePageSize),
    totalItems,
    totalPages,
    currentPage,
    pageSize: safePageSize,
  };
}

/** Condensed page numbers, e.g. [1, 2, 3, "…", 8] for large libraries. */
export function getPageNumbers(
  current: number,
  total: number,
): (number | "…")[] {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
  const pages = new Set<number>([
    1,
    2,
    current - 1,
    current,
    current + 1,
    total - 1,
    total,
  ]);
  const sorted = [...pages]
    .filter((n) => n >= 1 && n <= total)
    .sort((a, b) => a - b);
  const out: (number | "…")[] = [];
  let prev = 0;
  for (const n of sorted) {
    if (prev !== 0 && n - prev > 1) out.push("…");
    out.push(n);
    prev = n;
  }
  return out;
}

export interface PaginationControls {
  /** Numbered buttons plus "…" gaps (empty when there is 0–1 page). */
  pageNumbers: (number | "…")[];
  /** Whether to render each boundary control. */
  showFirst: boolean;
  showPrevious: boolean;
  showNext: boolean;
  showLast: boolean;
  /** Whether a rendered boundary control goes nowhere (disabled mode). */
  firstDisabled: boolean;
  previousDisabled: boolean;
  nextDisabled: boolean;
  lastDisabled: boolean;
}

function emptyControls(): PaginationControls {
  return {
    pageNumbers: [],
    showFirst: false,
    showPrevious: false,
    showNext: false,
    showLast: false,
    firstDisabled: false,
    previousDisabled: false,
    nextDisabled: false,
    lastDisabled: false,
  };
}

/**
 * Visibility for the full control set:
 * First, Previous, numbers (1, 2, …, A B C, …, Y Z), Next, Last.
 *
 * `ends` (from `PAGINATION_ENDS`) selects the boundary behaviour:
 * - `disabled` (default): every applicable control renders; the ones that
 *   would go nowhere render disabled instead (layout-stable).
 * - `smart`: controls that would go nowhere are omitted entirely.
 *
 * Shared rules (both modes):
 * - 0–1 pages: no pagination at all.
 * - 2 pages: First/Last stay hidden (they would duplicate 1/2); only
 *   Previous (past page 1), 1–2, Next (before page 2).
 * - Numbered buttons reuse `getPageNumbers`: every page when there are
 *   7 or fewer, otherwise the condensed 1, 2, …, prev/current/next,
 *   …, last−1, last window (e.g. page 1 of many → 1, 2, …, Y, Z).
 */
export function getPaginationControls(
  current: number,
  total: number,
  ends: PaginationEnds = "disabled",
): PaginationControls {
  if (total <= 1) return emptyControls();
  const safeCurrent = Math.min(Math.max(1, Math.floor(current) || 1), total);
  const atStart = safeCurrent <= 1;
  const atEnd = safeCurrent >= total;
  if (ends === "disabled") {
    return {
      pageNumbers: getPageNumbers(safeCurrent, total),
      // First/Last duplicate the visible 1/2 buttons under 3 pages.
      showFirst: total >= 3,
      showPrevious: true,
      showNext: true,
      showLast: total >= 3,
      firstDisabled: atStart,
      previousDisabled: atStart,
      nextDisabled: atEnd,
      lastDisabled: atEnd,
    };
  }
  return {
    pageNumbers: getPageNumbers(safeCurrent, total),
    // First/Last are shortcuts for long jumps — redundant when the target
    // page number is already one step away or when there are only 2 pages.
    showFirst: total >= 3 && !atStart,
    showPrevious: !atStart,
    showNext: !atEnd,
    showLast: total >= 3 && !atEnd,
    firstDisabled: false,
    previousDisabled: false,
    nextDisabled: false,
    lastDisabled: false,
  };
}

/**
 * Clean pagination URLs compatible with the existing Next.js architecture:
 * `/articles` for page 1, `/articles?page=N` otherwise.
 * Any other legitimate query params are preserved; `page` is replaced.
 * `basePath` supports tag archives (`/articles/tag/<slug>`); defaults to
 * the main index so existing callers are unchanged.
 */
export function buildArticlesPageUrl(
  page: number,
  preservedParams?: Record<string, string | string[] | undefined>,
  basePath: string = "/articles",
): string {
  const params = new URLSearchParams();
  if (preservedParams) {
    for (const [key, value] of Object.entries(preservedParams)) {
      if (key === "page" || value === undefined) continue;
      if (Array.isArray(value)) {
        for (const v of value) params.append(key, v);
      } else {
        params.set(key, value);
      }
    }
  }
  if (page > 1) params.set("page", String(page));
  const query = params.toString();
  return query ? `${basePath}?${query}` : basePath;
}
