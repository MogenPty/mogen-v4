import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { getAllArticles } from "@/lib/articles/loader";
import {
  articleServices,
  getRelatedArticlesForService,
  inferArticleServices,
  RELATED_ARTICLES_MAX,
  selectRelatedArticles,
} from "@/lib/articles/related";
import type { ArticleSummary } from "@/lib/articles/types";

function readSource(relativePath: string): string {
  return readFileSync(join(process.cwd(), relativePath), "utf8");
}

const ANCIENT = Date.UTC(2020, 0, 1);
const FAR_FUTURE = Date.UTC(2030, 0, 1);

function summary(
  over: Partial<ArticleSummary> & { slug: string },
): ArticleSummary {
  return {
    title: `Title ${over.slug}`,
    description: "A test description for related selection.",
    publishedAt: "2026-01-01",
    author: "Mogen",
    category: "Article",
    tags: [],
    services: [],
    featured: false,
    draft: false,
    readTime: "5 min read",
    date: "2026-01-01",
    excerpt: "A test description for related selection.",
    ...over,
  };
}

describe("related articles — selection rules (pure core)", () => {
  it("puts a featured relevant article first even when it is older", () => {
    const articles = [
      summary({
        slug: "new-plain",
        publishedAt: "2026-06-01",
        services: ["seo"],
      }),
      summary({
        slug: "old-featured",
        publishedAt: "2026-01-01",
        services: ["seo"],
        featured: true,
      }),
    ];
    const result = selectRelatedArticles(articles, "seo", 3);
    expect(result.map((a) => a.slug)).toEqual(["old-featured", "new-plain"]);
  });

  it("fills remaining positions with the latest relevant articles", () => {
    const articles = [
      summary({ slug: "a", publishedAt: "2026-01-01", services: ["seo"] }),
      summary({ slug: "b", publishedAt: "2026-02-01", services: ["seo"] }),
      summary({ slug: "c", publishedAt: "2026-03-01", services: ["seo"] }),
      summary({ slug: "d", publishedAt: "2026-04-01", services: ["seo"] }),
    ];
    expect(
      selectRelatedArticles(articles, "seo", 3).map((a) => a.slug),
    ).toEqual(["d", "c", "b"]);
  });

  it("never duplicates an article", () => {
    const articles = [
      summary({
        slug: "dup",
        publishedAt: "2026-03-01",
        services: ["seo"],
        featured: true,
      }),
      summary({ slug: "other", publishedAt: "2026-02-01", services: ["seo"] }),
    ];
    const result = selectRelatedArticles(articles, "seo", 3);
    expect(new Set(result.map((a) => a.slug)).size).toBe(result.length);
    expect(result.filter((a) => a.slug === "dup")).toHaveLength(1);
  });

  it("returns fewer than three when fewer match (no unrelated filler)", () => {
    const articles = [
      summary({ slug: "only", publishedAt: "2026-03-01", services: ["seo"] }),
      summary({
        slug: "unrelated",
        publishedAt: "2026-04-01",
        services: ["web-development"],
      }),
    ];
    const result = selectRelatedArticles(articles, "seo", 3);
    expect(result.map((a) => a.slug)).toEqual(["only"]);
  });

  it("returns [] for unknown services and empty inputs (section hides)", () => {
    const articles = [
      summary({ slug: "a", publishedAt: "2026-01-01", services: ["seo"] }),
    ];
    expect(selectRelatedArticles(articles, "no-such-service", 3)).toEqual([]);
    expect(selectRelatedArticles([], "seo", 3)).toEqual([]);
  });

  it("caps at three by default", () => {
    expect(RELATED_ARTICLES_MAX).toBe(3);
  });
});

describe("related articles — data-driven service associations", () => {
  it("prefers explicit services frontmatter over inference", () => {
    const explicit = summary({
      slug: "explicit",
      tags: ["Local SEO"],
      services: ["web-development"],
    });
    expect(articleServices(explicit)).toEqual(["web-development"]);
    expect(selectRelatedArticles([explicit], "seo", 3)).toEqual([]);
    expect(selectRelatedArticles([explicit], "web-development", 3)).toEqual([
      explicit,
    ]);
  });

  it("infers associations from tags/category when services are absent", () => {
    const inferred = summary({ slug: "inferred", tags: ["Local SEO"] });
    expect(inferArticleServices(inferred)).toContain("seo");
    expect(articleServices(inferred)).toContain("seo");
  });
});

describe("related articles — canonical loader behaviour", () => {
  it("shows the featured Brits article first for web development", () => {
    const related = getRelatedArticlesForService("web-development", {
      nowMs: FAR_FUTURE,
    });
    expect(related.length).toBeGreaterThan(0);
    expect(related.length).toBeLessThanOrEqual(3);
    expect(related[0].slug).toBe("web-development-in-the-brits-area");
    expect(related[0].featured).toBe(true);
  });

  it("selects relevant SEO articles without duplicates", () => {
    const related = getRelatedArticlesForService("seo", { nowMs: FAR_FUTURE });
    expect(related.length).toBeGreaterThan(0);
    expect(related.length).toBeLessThanOrEqual(3);
    expect(new Set(related.map((a) => a.slug)).size).toBe(related.length);
    for (const article of related) {
      expect(articleServices(article)).toContain("seo");
      expect(article.draft).not.toBe(true);
    }
  });

  it("excludes scheduled articles end-to-end", () => {
    expect(
      getRelatedArticlesForService("seo", { nowMs: ANCIENT }),
    ).toEqual([]);
    expect(
      getRelatedArticlesForService("web-development", { nowMs: ANCIENT }),
    ).toEqual([]);
  });

  it("hides the section when no relevant articles exist", () => {
    // No current article maps to Business Documentation, so the service
    // page renders no related section rather than an empty placeholder.
    expect(
      getRelatedArticlesForService("business-documentation", {
        nowMs: FAR_FUTURE,
      }),
    ).toEqual([]);
  });

  it("agrees with the canonical index on the published set", () => {
    const published = new Set(
      getAllArticles({ nowMs: FAR_FUTURE }).map((a) => a.slug),
    );
    for (const slug of [
      "web-development",
      "seo",
      "digital-marketing",
      "business-documentation",
    ]) {
      for (const article of getRelatedArticlesForService(slug, {
        nowMs: FAR_FUTURE,
      })) {
        expect(published.has(article.slug)).toBe(true);
      }
    }
  });
});

describe("related articles — service page wiring", () => {
  it("fetches related articles server-side and renders before the FAQ", () => {
    const page = readSource("app/services/[slug]/page.tsx");
    expect(page).toContain("getRelatedArticlesForService");
    expect(page).toContain("relatedArticles");
    const detail = readSource("components/mogen/service-detail.tsx");
    expect(detail).toContain("Related articles");
    // The related section sits immediately before the FAQ section.
    expect(detail.indexOf("Related articles")).toBeLessThan(
      detail.indexOf("Frequently asked questions"),
    );
  });

  it("keeps associations data-driven (no hardcoded article slugs)", () => {
    const detail = readSource("components/mogen/service-detail.tsx");
    expect(detail).not.toContain("web-development-in-the-brits-area");
    expect(detail).not.toContain("local-seo-pretoria-2026");
    expect(detail).not.toContain("local-seo-clinic-guide");
  });
});
