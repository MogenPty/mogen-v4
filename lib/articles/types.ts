/**
 * Typed article frontmatter model.
 * The MDX frontmatter is the source of truth for article metadata —
 * never duplicate it in a separate TypeScript registry.
 */

export interface ArticleFrontmatter {
  title: string;
  slug: string;
  description: string;
  /** ISO date string (YYYY-MM-DD). Canonical publication date. */
  publishedAt: string;
  /** ISO date string (YYYY-MM-DD). Shown as "Updated" when present. */
  updatedAt?: string;
  author?: string;
  category?: string;
  tags?: string[];
  featured?: boolean;
  heroImage?: string;
  heroImageAlt?: string;
  /** Future-compatible draft flag. Drafts never list and never index. */
  draft?: boolean;
  /** Optional explicit read time (e.g. "8 min read"). Computed when absent. */
  readTime?: string;
}

export interface ArticleMeta extends ArticleFrontmatter {
  /** Normalised required fields with defaults applied. */
  author: string;
  category: string;
  tags: string[];
  featured: boolean;
  draft: boolean;
  readTime: string;
}

export interface ArticleSummary extends ArticleMeta {
  /** Reading helpers for the legacy listing shape. */
  date: string;
  excerpt: string;
}

export const ARTICLES_DIR_NAME = "articles";
export const ARTICLE_IMAGE_PREFIX = "/images/articles/";
export const DEFAULT_ARTICLE_AUTHOR = "Mogen";
export const DEFAULT_ARTICLE_CATEGORY = "Article";
