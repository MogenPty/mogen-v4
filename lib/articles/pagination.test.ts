import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import sitemap from "@/app/sitemap";
import {
  ARTICLES_PAGE_SIZE,
  getArticles,
  getPosts,
  parsePageParam,
  type Post,
} from "@/data/blog";
import { getSiteUrl } from "@/data/site";
import { getAllArticles } from "@/lib/articles/loader";
import { isPublishedByDate } from "@/lib/articles/publication";

function readSource(relativePath: string): string {
  return readFileSync(join(process.cwd(), relativePath), "utf8");
}

const ANCIENT = Date.UTC(2020, 0, 1);

function makePost(slug: string, date: string): Post {
  return {
    slug,
    title: `Title ${slug}`,
    category: "Article",
    excerpt: "Excerpt for testing purposes.",
    date,
    readTime: "5 min read",
    author: "Test Author",
    body: "Body",
    tags: [],
    services: [],
  };
}

describe("pagination — 12 per page default", () => {
  it("defaults to 12 articles per page (single constant)", () => {
    expect(ARTICLES_PAGE_SIZE).toBe(12);
  });

  it("holds at most 12 on the default page", () => {
    const posts: Post[] = [];
    for (let i = 0; i < 25; i++) {
      posts.push(makePost(`p-${String(i).padStart(2, "0")}`, `2026-01-${String((i % 28) + 1).padStart(2, "0")}`));
    }
    const p1 = getArticles({ page: 1, posts });
    expect(p1.pageSize).toBe(12);
    expect(p1.items.length).toBeLessThanOrEqual(12);
  });

  it("places the next batch on page 2 with no cross-page duplicates", () => {
    const posts: Post[] = [];
    for (let i = 1; i <= 25; i++) {
      posts.push(makePost(`post-${String(i).padStart(2, "0")}`, `2026-01-${String(i).padStart(2, "0")}`));
    }
    const p1 = getArticles({ page: 1, posts });
    const p2 = getArticles({ page: 2, posts });
    const p3 = getArticles({ page: 3, posts });
    expect(p1.items).toHaveLength(12);
    expect(p2.items).toHaveLength(12);
    expect(p3.items).toHaveLength(1);
    // Newest first across the boundary.
    expect(p1.items[0].slug).toBe("post-25");
    expect(p2.items[0].slug).toBe("post-13");
    const slugs = [...p1.items, ...p2.items, ...p3.items].map((p) => p.slug);
    expect(new Set(slugs).size).toBe(25);
  });

  it("handles invalid page values safely at the data layer", () => {
    expect(parsePageParam(undefined)).toBe(1);
    expect(parsePageParam("abc")).toBe(1);
    expect(parsePageParam("0")).toBe(1);
    expect(parsePageParam("2")).toBe(2);
  });

  it("returns a predictable 404 for out-of-range pages at the route", () => {
    const route = readSource("app/articles/page.tsx");
    expect(route).toContain("notFound()");
    expect(route).toContain("page !== currentPage");
    const tagRoute = readSource("app/articles/tag/[tag]/page.tsx");
    expect(tagRoute).toContain("notFound()");
  });

  it("keeps page 1 canonical at /articles", () => {
    const route = readSource("app/articles/page.tsx");
    expect(route).toContain("/articles?page=");
    expect(readSource("data/blog.ts")).toContain("basePath");
  });
});

describe("pagination — only published articles paginate", () => {
  it("excludes scheduled articles from the public list entirely", () => {
    expect(getPosts({ nowMs: ANCIENT })).toEqual([]);
    const posts = getPosts();
    expect(posts.length).toBeGreaterThan(0);
    for (const post of posts) {
      expect(isPublishedByDate(post.date)).toBe(true);
    }
  });

  it("paginates the canonical published list (index and sitemap agree)", () => {
    const loaderUrls = new Set(
      getAllArticles().map((a) => `${getSiteUrl()}/articles/${a.slug}`),
    );
    const sitemapArticleUrls = sitemap()
      .map((e) => e.url)
      .filter(
        (url) =>
          url.startsWith(`${getSiteUrl()}/articles/`) &&
          url !== `${getSiteUrl()}/articles` &&
          !url.includes("/articles/tag/"),
      );
    expect(new Set(sitemapArticleUrls)).toEqual(loaderUrls);
  });

  it("never puts pagination or tag URLs into the sitemap", () => {
    for (const entry of sitemap()) {
      expect(entry.url).not.toContain("?page=");
      expect(entry.url).not.toContain("/articles/tag/");
    }
  });
});
