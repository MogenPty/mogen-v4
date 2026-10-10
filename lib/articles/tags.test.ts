import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { getAllArticles } from "@/lib/articles/loader";
import { isArticlePublished } from "@/lib/articles/publication";
import {
  getArticlesByTag,
  getTagArchives,
  slugifyTag,
  tagArchivePath,
  tagLabelCollisions,
} from "@/lib/articles/tags";
import type { ArticleSummary } from "@/lib/articles/types";

function readSource(relativePath: string): string {
  return readFileSync(join(process.cwd(), relativePath), "utf8");
}

function summary(
  slug: string,
  tags: string[],
  publishedAt = "2026-01-01",
): ArticleSummary {
  return {
    title: `Title ${slug}`,
    slug,
    description: "A test description for tag archives.",
    publishedAt,
    author: "Mogen",
    category: "Article",
    tags,
    services: [],
    featured: false,
    draft: false,
    readTime: "5 min read",
    date: publishedAt,
    excerpt: "A test description for tag archives.",
  };
}

describe("tags — slug contract", () => {
  it("generates stable slugs and preserves labels for display", () => {
    expect(slugifyTag("Web Development")).toBe("web-development");
    expect(slugifyTag("SEO")).toBe("seo");
    expect(slugifyTag("Google Business Profile")).toBe(
      "google-business-profile",
    );
    expect(slugifyTag("  Local  SEO ")).toBe("local-seo");
    expect(tagArchivePath("web-development")).toBe(
      "/articles/tag/web-development",
    );
  });

  it("normalises case variants to one slug (collision, not duplicates)", () => {
    expect(slugifyTag("seo")).toBe(slugifyTag("SEO"));
    const archives = getTagArchives([
      summary("a", ["SEO"]),
      summary("b", ["seo"]),
    ]);
    expect([...archives.keys()]).toEqual(["seo"]);
    const archive = archives.get("seo")!;
    expect(archive.articles).toHaveLength(2);
    expect(archive.labels).toEqual(expect.arrayContaining(["SEO", "seo"]));
    expect(tagLabelCollisions([summary("a", ["SEO"]), summary("b", ["seo"])]))
      .toEqual([{ slug: "seo", labels: expect.arrayContaining(["SEO", "seo"]) }]);
  });
});

describe("tags — archives use the canonical published list", () => {
  it("contains only matching published articles", () => {
    const published = getAllArticles();
    const archives = getTagArchives(published);
    expect(archives.size).toBeGreaterThan(0);
    const webDev = archives.get("web-development");
    expect(webDev).toBeDefined();
    expect(webDev?.label).toBe("Web Development");
    for (const article of webDev?.articles ?? []) {
      expect(article.tags.map(slugifyTag)).toContain("web-development");
      expect(isArticlePublished(article)).toBe(true);
    }
  });

  it("returns [] for unknown tags (route turns this into a 404)", () => {
    expect(getArticlesByTag(getAllArticles(), "no-such-tag")).toEqual([]);
  });

  it("sorts archive articles newest-first", () => {
    const articles = getArticlesByTag(getAllArticles(), "local-seo");
    for (let i = 1; i < articles.length; i++) {
      expect(
        articles[i - 1].publishedAt >= articles[i].publishedAt,
      ).toBe(true);
    }
  });
});

describe("tags — archive route wiring", () => {
  it("serves /articles/tag/[tag] with 404s for unknown/empty tags", () => {
    const route = readSource("app/articles/tag/[tag]/page.tsx");
    expect(route).toContain("generateStaticParams");
    expect(route).toContain("notFound()");
    expect(route).toContain("getTagArchives");
    expect(route).toContain("getAllArticles");
  });

  it("keeps thin archives out of the index with canonical metadata", () => {
    const route = readSource("app/articles/tag/[tag]/page.tsx");
    expect(route).toContain("index: false");
    expect(route).toContain("canonical");
    // Archive URLs come from the canonical helper (single source of truth).
    expect(route).toContain("tagArchivePath");
    expect(readSource("lib/articles/tags.ts")).toContain("/articles/tag/");
  });

  it("makes card and detail tags clickable to their archive", () => {
    expect(readSource("components/mogen/article-card.tsx")).toContain(
      "tagArchivePath",
    );
    expect(readSource("components/mogen/blog-post-block.tsx")).toContain(
      "tagArchivePath",
    );
  });
});
