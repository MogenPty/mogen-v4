import { existsSync, readdirSync, readFileSync } from "node:fs";
import { basename, join } from "node:path";
import matter from "gray-matter";
import {
  ARTICLE_IMAGE_PREFIX,
  ARTICLES_DIR_NAME,
  DEFAULT_ARTICLE_AUTHOR,
  DEFAULT_ARTICLE_CATEGORY,
  type ArticleFrontmatter,
  type ArticleMeta,
  type ArticleSummary,
} from "./types";

export {
  ARTICLE_IMAGE_PREFIX,
  ARTICLES_DIR_NAME,
  DEFAULT_ARTICLE_AUTHOR,
  DEFAULT_ARTICLE_CATEGORY,
};

function articlesDirectory(cwd = process.cwd()): string {
  return join(cwd, ARTICLES_DIR_NAME);
}

function isValidDateString(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const time = Date.parse(value);
  return Number.isFinite(time);
}

function isValidSlug(value: string): boolean {
  return /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(value);
}

/** Local article images must be web paths under /images/articles/. */
export function isAllowedArticleImageSrc(src: string): boolean {
  if (!src.startsWith(ARTICLE_IMAGE_PREFIX)) return false;
  if (src.includes("..") || src.includes("\\")) return false;
  if (src.startsWith("public/") || src.includes("public/images")) return false;
  return /\.(jpg|jpeg|png|webp|avif|gif|svg)$/i.test(src.split("?")[0]);
}

export function validateHeroImagePath(src: string, file: string): void {
  if (!isAllowedArticleImageSrc(src)) {
    throw new Error(
      `Invalid article ${file}\n\nInvalid heroImage path: "${src}". Expected a web path under "${ARTICLE_IMAGE_PREFIX}" (e.g. "/images/articles/example.jpg"), not a filesystem path.`,
    );
  }
}

function estimateReadTime(markdownBody: string): string {
  const words = markdownBody.trim().split(/\s+/).filter(Boolean).length;
  const minutes = Math.max(1, Math.round(words / 200));
  return `${minutes} min read`;
}

export interface ParsedArticle {
  meta: ArticleMeta;
  summary: ArticleSummary;
  /** Raw Markdown/MDX body without frontmatter (used for read-time + fallback). */
  body: string;
  fileName: string;
}

function fail(file: string, reasons: string[]): never {
  throw new Error(
    `Invalid article ${file}\n\n${reasons.map((r) => `- ${r}`).join("\n")}`,
  );
}

/** Parse + validate a single .mdx file's frontmatter. Exported for tests. */
export function parseArticleFile(fileName: string, raw: string): ParsedArticle {
  const file = `${ARTICLES_DIR_NAME}/${fileName}`;
  let data: Record<string, unknown>;
  let content: string;
  try {
    const parsed = matter(raw);
    data = parsed.data as Record<string, unknown>;
    content = parsed.content;
  } catch (error) {
    fail(file, [
      `Malformed frontmatter: ${error instanceof Error ? error.message : String(error)}`,
    ]);
  }

  const expectedSlug = basename(fileName, ".mdx");
  const errors: string[] = [];

  const title = data!.title;
  const slug = data!.slug;
  const description = data!.description;
  const publishedAt = data!.publishedAt;

  if (typeof title !== "string" || title.trim().length === 0) {
    errors.push("Missing required frontmatter: title");
  }
  if (typeof slug !== "string" || slug.trim().length === 0) {
    errors.push("Missing required frontmatter: slug");
  } else if (!isValidSlug(slug)) {
    errors.push(
      `Invalid slug "${slug}": expected lowercase letters, numbers and hyphens only`,
    );
  }
  if (typeof description !== "string" || description.trim().length === 0) {
    errors.push("Missing required frontmatter: description");
  }
  if (typeof publishedAt !== "string" || !isValidDateString(publishedAt)) {
    errors.push(
      'Missing or invalid frontmatter: publishedAt (expected "YYYY-MM-DD")',
    );
  }

  if (typeof slug === "string" && slug !== expectedSlug) {
    errors.push(
      `Filename/slug mismatch: file "${fileName}" but slug "${slug}" (expected slug "${expectedSlug}")`,
    );
  }

  const updatedAt = data!.updatedAt;
  if (updatedAt !== undefined) {
    if (typeof updatedAt !== "string" || !isValidDateString(updatedAt)) {
      errors.push('Invalid frontmatter: updatedAt (expected "YYYY-MM-DD")');
    }
  }

  const heroImage = data!.heroImage;
  if (heroImage !== undefined) {
    if (typeof heroImage !== "string" || !isAllowedArticleImageSrc(heroImage)) {
      errors.push(
        `Invalid heroImage path: ${JSON.stringify(heroImage)} (expected a web path under "${ARTICLE_IMAGE_PREFIX}")`,
      );
    }
  }

  const tags = data!.tags;
  if (tags !== undefined) {
    if (
      !Array.isArray(tags) ||
      tags.some((t) => typeof t !== "string" || t.trim().length === 0)
    ) {
      errors.push("Invalid frontmatter: tags (expected a list of strings)");
    }
  }

  if (errors.length > 0) fail(file, errors);

  const fm = data as unknown as ArticleFrontmatter;
  const meta: ArticleMeta = {
    title: fm.title.trim(),
    slug: fm.slug,
    description: fm.description.trim(),
    publishedAt: fm.publishedAt,
    ...(fm.updatedAt ? { updatedAt: fm.updatedAt } : {}),
    author:
      typeof fm.author === "string" && fm.author.trim().length > 0
        ? fm.author
        : DEFAULT_ARTICLE_AUTHOR,
    category:
      typeof fm.category === "string" && fm.category.trim().length > 0
        ? fm.category
        : DEFAULT_ARTICLE_CATEGORY,
    tags: Array.isArray(fm.tags) ? (fm.tags as string[]) : [],
    featured: fm.featured === true,
    ...(fm.heroImage ? { heroImage: fm.heroImage } : {}),
    ...(fm.heroImageAlt ? { heroImageAlt: fm.heroImageAlt } : {}),
    draft: fm.draft === true,
    readTime:
      typeof fm.readTime === "string" && fm.readTime.trim().length > 0
        ? fm.readTime
        : estimateReadTime(content!),
  };

  return {
    meta,
    summary: {
      ...meta,
      date: meta.publishedAt,
      excerpt: meta.description,
    },
    body: content!,
    fileName,
  };
}

/** Fail loudly on duplicate slugs — never silent unpredictable routing. */
export function assertUniqueSlugs(
  entries: { slug: string; fileName: string }[],
): void {
  const seen = new Map<string, string>();
  for (const entry of entries) {
    const first = seen.get(entry.slug);
    if (first) {
      throw new Error(
        `Duplicate article slug "${entry.slug}" found in ${ARTICLES_DIR_NAME}/${first} and ${ARTICLES_DIR_NAME}/${entry.fileName}. Slugs must be unique.`,
      );
    }
    seen.set(entry.slug, entry.fileName);
  }
}

function discoverArticleFiles(cwd = process.cwd()): string[] {
  const dir = articlesDirectory(cwd);
  if (!existsSync(dir)) return [];
  return readdirSync(dir)
    .filter((f) => f.endsWith(".mdx"))
    .sort((a, b) => a.localeCompare(b));
}

/**
 * Load + validate every article. Drafts are excluded by default.
 * Duplicate slugs fail loudly (never silent unpredictable routing).
 */
export function loadArticles(options?: {
  cwd?: string;
  includeDrafts?: boolean;
}): ParsedArticle[] {
  const cwd = options?.cwd ?? process.cwd();
  const includeDrafts = options?.includeDrafts ?? false;
  const files = discoverArticleFiles(cwd);
  const parsed = files.map((fileName) => {
    const raw = readFileSync(join(articlesDirectory(cwd), fileName), "utf8");
    return parseArticleFile(fileName, raw);
  });

  assertUniqueSlugs(
    parsed.map((a) => ({ slug: a.meta.slug, fileName: a.fileName })),
  );

  const visible = includeDrafts
    ? parsed
    : parsed.filter((a) => !a.meta.draft);
  // Predictable ordering: published date descending, slug tiebreak.
  return [...visible].sort((a, b) => {
    if (a.meta.publishedAt !== b.meta.publishedAt) {
      return a.meta.publishedAt < b.meta.publishedAt ? 1 : -1;
    }
    return a.meta.slug.localeCompare(b.meta.slug);
  });
}

/** Listing metadata only — never loads full MDX bodies into cards. */
export function getAllArticles(options?: {
  cwd?: string;
  includeDrafts?: boolean;
}): ArticleSummary[] {
  return loadArticles(options).map((a) => a.summary);
}

export function getArticleSlugs(options?: {
  cwd?: string;
  includeDrafts?: boolean;
}): string[] {
  return loadArticles(options).map((a) => a.meta.slug);
}

export function getArticleBySlug(
  slug: string,
  options?: { cwd?: string; includeDrafts?: boolean },
): ArticleSummary | undefined {
  return loadArticles(options)
    .map((a) => a.summary)
    .find((a) => a.slug === slug);
}

/** Full validated metadata (throws when missing). Server-side only. */
export function requireArticleBySlug(
  slug: string,
  options?: { cwd?: string; includeDrafts?: boolean },
): ParsedArticle {
  const found = loadArticles(options).find((a) => a.meta.slug === slug);
  if (!found) {
    throw new Error(`Unknown article slug "${slug}".`);
  }
  return found;
}
