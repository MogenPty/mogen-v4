import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  ARTICLES_PAGE_SIZE,
  buildArticlesPageUrl,
  getArticles,
  getLatestFeaturedPost,
  getPageNumbers,
  getRegularPosts,
  parsePageParam,
  POSTS,
  sortPostsByDateDesc,
  type Post,
} from "@/data/blog";

function readSource(relativePath: string): string {
  return readFileSync(join(process.cwd(), relativePath), "utf8");
}

function makePost(slug: string, date: string, featured?: boolean): Post {
  return {
    slug,
    title: `Title ${slug}`,
    category: "Article",
    excerpt: "Excerpt for testing purposes.",
    date,
    readTime: "5 min read",
    author: "Test Author",
    body: "Body",
    ...(featured === true ? { featured: true as const } : {}),
  };
}

describe("articles listing — ordering (newest first)", () => {
  it("sorts articles newest first by date, not array/slug order", () => {
    const posts = [
      makePost("b-middle", "2026-09-17"),
      makePost("c-oldest", "2026-09-10"),
      makePost("a-newest", "2026-09-24"),
    ];
    const sorted = sortPostsByDateDesc(posts);
    expect(sorted.map((p) => p.slug)).toEqual(["a-newest", "b-middle", "c-oldest"]);
  });

  it("uses deterministic secondary ordering for identical dates", () => {
    const posts = [makePost("b", "2026-09-10"), makePost("a", "2026-09-10")];
    const sorted = sortPostsByDateDesc(posts);
    expect(sorted.map((p) => p.slug)).toEqual(["a", "b"]);
  });

  it("orders the real POSTS collection newest first", () => {
    const sorted = sortPostsByDateDesc(POSTS);
    for (let i = 1; i < sorted.length; i++) {
      expect(sorted[i - 1].date >= sorted[i].date).toBe(true);
    }
  });
});

describe("articles listing — featured selection", () => {
  it("selects the latest explicitly featured article", () => {
    const posts = [
      makePost("old-featured", "2026-09-10", true),
      makePost("new-plain", "2026-09-24"),
      makePost("new-featured", "2026-09-17", true),
    ];
    expect(getLatestFeaturedPost(posts)?.slug).toBe("new-featured");
  });

  it("selects the latest when multiple articles are featured", () => {
    const posts = [
      makePost("f1", "2026-09-10", true),
      makePost("f2", "2026-09-24", true),
      makePost("f3", "2026-09-17", true),
    ];
    expect(getLatestFeaturedPost(posts)?.slug).toBe("f2");
  });

  it("returns undefined when no featured article exists", () => {
    expect(getLatestFeaturedPost([makePost("a", "2026-09-10")])).toBeUndefined();
    expect(getLatestFeaturedPost([])).toBeUndefined();
  });

  it("does not automatically mark the newest article as featured", () => {
    const posts = [makePost("newest", "2026-10-01"), makePost("older", "2026-09-01")];
    expect(getLatestFeaturedPost(posts)).toBeUndefined();
  });
});

describe("articles listing — featured exclusion", () => {
  it("excludes the featured article from the normal listing", () => {
    const posts = [
      makePost("new-featured", "2026-09-24", true),
      makePost("mid", "2026-09-17"),
      makePost("old", "2026-09-10"),
    ];
    const regular = getRegularPosts(posts);
    expect(regular.map((p) => p.slug)).toEqual(["mid", "old"]);
  });

  it("returns all posts newest-first when no featured article exists", () => {
    const posts = [makePost("b", "2026-09-10"), makePost("a", "2026-09-24")];
    expect(getRegularPosts(posts).map((p) => p.slug)).toEqual(["a", "b"]);
  });
});

describe("articles listing — pagination", () => {
  function manyPosts(n: number): Post[] {
    const posts: Post[] = [];
    for (let i = 0; i < n; i++) {
      const day = String(i + 1).padStart(2, "0");
      posts.push(makePost(`post-${day}`, `2026-01-${day}`));
    }
    return posts;
  }

  it("paginates with a sensible default page size", () => {
    expect(ARTICLES_PAGE_SIZE).toBe(9);
  });

  it("excludes featured BEFORE paginating so pages stay consistent", () => {
    const posts = [
      makePost("featured-newest", "2026-01-20", true),
      ...manyPosts(19),
    ];
    const p1 = getArticles({ page: 1, pageSize: 9, posts });
    const p2 = getArticles({ page: 2, pageSize: 9, posts });
    const p3 = getArticles({ page: 3, pageSize: 9, posts });
    expect(p1.items).toHaveLength(9);
    expect(p2.items).toHaveLength(9);
    expect(p3.items).toHaveLength(1);
    expect(p1.totalItems).toBe(19);
    expect(p1.totalPages).toBe(3);
    const slugs = [...p1.items, ...p2.items, ...p3.items].map((p) => p.slug);
    expect(slugs).not.toContain("featured-newest");
    expect(new Set(slugs).size).toBe(19);
  });

  it("places the correct articles on each page", () => {
    const posts = manyPosts(20);
    const p1 = getArticles({ page: 1, pageSize: 9, posts });
    const p2 = getArticles({ page: 2, pageSize: 9, posts });
    // Newest first: post-20 … post-12 on page 1, post-11 … post-03 on page 2.
    expect(p1.items[0].slug).toBe("post-20");
    expect(p1.items).toHaveLength(9);
    expect(p2.items[0].slug).toBe("post-11");
    expect(p2.items).toHaveLength(9);
  });

  it("produces no duplicate articles across pages", () => {
    const posts = manyPosts(25);
    const seen = new Set<string>();
    const totalPages = Math.ceil(25 / ARTICLES_PAGE_SIZE);
    for (let page = 1; page <= totalPages; page++) {
      const { items } = getArticles({ page, posts });
      for (const item of items) {
        expect(seen.has(item.slug)).toBe(false);
        seen.add(item.slug);
      }
    }
    expect(seen.size).toBe(25);
  });

  it("handles invalid page values safely", () => {
    expect(parsePageParam(undefined)).toBe(1);
    expect(parsePageParam("abc")).toBe(1);
    expect(parsePageParam("0")).toBe(1);
    expect(parsePageParam("-3")).toBe(1);
    expect(parsePageParam("2.5")).toBe(1);
    expect(parsePageParam("2")).toBe(2);
    const posts = manyPosts(20);
    // Out-of-range clamps to the last page rather than crashing.
    const clamped = getArticles({ page: 999, pageSize: 9, posts });
    expect(clamped.currentPage).toBe(clamped.totalPages);
    expect(clamped.items.length).toBeGreaterThan(0);
  });

  it("condenses page numbers for very large libraries", () => {
    const numbers = getPageNumbers(4, 100);
    expect(numbers[0]).toBe(1);
    expect(numbers[numbers.length - 1]).toBe(100);
    expect(numbers).toContain("…");
    expect(numbers.length).toBeLessThan(12);
  });
});

describe("articles listing — pagination URLs", () => {
  it("uses /articles for page 1", () => {
    expect(buildArticlesPageUrl(1)).toBe("/articles");
  });

  it("uses /articles?page=2 for page 2", () => {
    expect(buildArticlesPageUrl(2)).toBe("/articles?page=2");
    expect(buildArticlesPageUrl(3)).toBe("/articles?page=3");
  });

  it("preserves legitimate query params without inventing filters", () => {
    expect(buildArticlesPageUrl(2, { utm_source: "newsletter" })).toBe(
      "/articles?utm_source=newsletter&page=2",
    );
    expect(buildArticlesPageUrl(1, { utm_source: "newsletter" })).toBe(
      "/articles?utm_source=newsletter",
    );
  });

  it("wires the listing page to ?page= (first page stays /articles)", () => {
    const listing = readSource("app/articles/page.tsx");
    expect(listing).toContain("searchParams");
    expect(listing).toContain("parsePageParam");
    const block = readSource("components/mogen/blog-block.tsx");
    expect(block).toContain("buildArticlesPageUrl");
    expect(block).toContain('aria-label="Articles pagination"');
  });
});

describe("articles listing — no developer post count", () => {
  it("no longer renders a total post count as public UI", () => {
    const block = readSource("components/mogen/blog-block.tsx");
    expect(block).not.toContain("Posts:");
    expect(block).not.toContain("POSTS.length");
    expect(block).not.toContain("{posts.length}");
    const listing = readSource("app/articles/page.tsx");
    expect(listing).not.toContain("Posts:");
  });
});

describe("articles listing — zero/one-page edge cases", () => {
  it("handles zero articles with an empty state, not Posts: 0", () => {
    const result = getArticles({ page: 1, posts: [] });
    expect(result.totalItems).toBe(0);
    expect(result.totalPages).toBe(0);
    expect(result.items).toEqual([]);
    const block = readSource("components/mogen/blog-block.tsx");
    expect(block).toContain("No articles yet");
    expect(block).not.toContain("Posts: 0");
  });

  it("shows a single article normally without pagination controls", () => {
    const result = getArticles({ page: 1, posts: [makePost("only", "2026-09-01")] });
    expect(result.totalPages).toBe(1);
    expect(result.items.map((p) => p.slug)).toEqual(["only"]);
  });
});

describe("articles listing — SEO invariants", () => {
  it("keeps /articles canonical for page 1 and distinct canonicals beyond", () => {
    const listing = readSource("app/articles/page.tsx");
    expect(listing).toContain("generateMetadata");
    expect(listing).toContain("/articles?page=");
  });

  it("keeps pagination URLs out of the article sitemap", () => {
    const sitemap = readSource("app/sitemap.ts");
    expect(sitemap).toContain("/articles");
    expect(sitemap).not.toContain("?page=");
  });
});
