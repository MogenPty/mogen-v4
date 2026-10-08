import {
  getAllArticles as getAllArticleSummaries,
  loadArticles,
} from "@/lib/articles/loader";
import type { ArticleSummary } from "@/lib/articles/types";

export interface Post {
  slug: string;
  title: string;
  category: string;
  excerpt: string;
  date: string;
  readTime: string;
  author: string;
  body: string;
  /**
   * Explicit editorial flag — the latest post with `featured: true` is
   * shown in the prominent top position on /articles (page 1 only).
   * Never hardcode a slug; selection is date-ordered (see below).
   */
  featured?: boolean;
}

export const ARTICLES_PAGE_SIZE = 9;

function toPost(summary: ArticleSummary, body: string): Post {
  return {
    slug: summary.slug,
    title: summary.title,
    category: summary.category,
    excerpt: summary.description,
    date: summary.publishedAt,
    readTime: summary.readTime,
    author: summary.author,
    body,
    ...(summary.featured ? { featured: true as const } : {}),
  };
}

/**
 * Load posts fresh from MDX frontmatter on every call.
 * The `.mdx` files in `/articles` are the source of truth — reading the
 * filesystem per call (instead of caching at module scope) is what lets
 * newly added articles appear in listings without a server restart.
 * Article counts are tiny, so this costs nothing measurable.
 */
function loadPosts(cwd = process.cwd()): Post[] {
  const parsed = loadArticles({ cwd });
  const bySlug = new Map(parsed.map((a) => [a.meta.slug, a]));
  return getAllArticleSummaries({ cwd }).map((summary) => {
    const body = bySlug.get(summary.slug)?.body ?? "";
    return toPost(summary, body);
  });
}

export interface GetPostsOptions {
  cwd?: string;
}

/** Fresh post collection. Prefer this over `POSTS` in components. */
export function getPosts(options?: GetPostsOptions): Post[] {
  return loadPosts(options?.cwd ?? process.cwd());
}

/**
 * Backwards-compatible snapshot for tests and one-off uses.
 * NOTE: evaluated once at module load — components must use `getPosts()`
 * (or the fresh defaults below) so new articles appear without restarts.
 */
export const POSTS: Post[] = loadPosts();

export const getPost = (slug: string, options?: GetPostsOptions) =>
  getPosts(options).find((p) => p.slug === slug);

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
 */
export function getArticles({
  page = 1,
  pageSize = ARTICLES_PAGE_SIZE,
  posts,
}: GetArticlesOptions = {}): PaginatedResult {
  const safePageSize = Number.isInteger(pageSize) && pageSize > 0 ? pageSize : ARTICLES_PAGE_SIZE;
  const regular = getRegularPosts(posts);
  const totalItems = regular.length;
  const totalPages = totalItems === 0 ? 0 : Math.ceil(totalItems / safePageSize);
  const currentPage = totalItems === 0 ? 1 : Math.min(Math.max(1, Math.floor(page) || 1), totalPages);
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
export function getPageNumbers(current: number, total: number): (number | "…")[] {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
  const pages = new Set<number>([1, 2, current - 1, current, current + 1, total - 1, total]);
  const sorted = [...pages].filter((n) => n >= 1 && n <= total).sort((a, b) => a - b);
  const out: (number | "…")[] = [];
  let prev = 0;
  for (const n of sorted) {
    if (prev !== 0 && n - prev > 1) out.push("…");
    out.push(n);
    prev = n;
  }
  return out;
}

/**
 * Clean pagination URLs compatible with the existing Next.js architecture:
 * `/articles` for page 1, `/articles?page=N` otherwise.
 * Any other legitimate query params are preserved; `page` is replaced.
 */
export function buildArticlesPageUrl(
  page: number,
  preservedParams?: Record<string, string | string[] | undefined>,
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
  return query ? `/articles?${query}` : "/articles";
}
