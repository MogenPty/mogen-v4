import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  assertUniqueSlugs,
  getAllArticles,
  getArticleBySlug,
  getArticleSlugs,
  isAllowedArticleImageSrc,
  loadArticles,
  parseArticleFile,
} from "@/lib/articles/loader";

function readSource(relativePath: string): string {
  return readFileSync(join(process.cwd(), relativePath), "utf8");
}

function validRaw(overrides: string = ""): string {
  return `---
title: "Test Article"
slug: "test-article"
description: "A test description."
publishedAt: "2026-10-07"
${overrides}---
Body content here.
`;
}

describe("articles — discovery", () => {
  it("discovers valid articles with parsed metadata and slugs", () => {
    const slugs = getArticleSlugs();
    expect(slugs.length).toBeGreaterThan(0);
    expect(slugs).toContain("local-seo-pretoria-2026");
    const article = getArticleBySlug("local-seo-pretoria-2026");
    expect(article?.title).toBe(
      "The 2026 Local SEO Playbook for Pretoria Businesses",
    );
    expect(article?.description).toContain("map pack");
  });

  it("returns metadata for the listing without requiring body edits", () => {
    const all = getAllArticles();
    for (const a of all) {
      expect(a.slug).toBeTruthy();
      expect(a.title).toBeTruthy();
      expect(a.description).toBeTruthy();
      expect(a.publishedAt).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    }
  });

  it("orders articles newest-first (publishedAt desc)", () => {
    const all = getAllArticles();
    for (let i = 1; i < all.length; i++) {
      expect(all[i - 1].publishedAt >= all[i].publishedAt).toBe(true);
    }
  });

  it("preserves every migrated article slug", () => {
    // The six migrated slugs must always resolve; the set is intentionally
    // open (not exact) so authors can add new articles without editing tests.
    const slugs = getArticleSlugs();
    for (const expected of [
      "core-web-vitals-guide",
      "google-business-profile-guide",
      "landing-page-conversion",
      "local-seo-clinic-guide",
      "local-seo-pretoria-2026",
      "restaurant-website-bookings-guide",
    ]) {
      expect(slugs).toContain(expected);
    }
    for (const slug of slugs) {
      expect(slug).toMatch(/^[a-z0-9]+(?:-[a-z0-9]+)*$/);
    }
  });
});

describe("articles — validation", () => {
  it("fails on missing title with the exact file", () => {
    const raw = validRaw().replace('title: "Test Article"\n', "");
    expect(() => parseArticleFile("test-article.mdx", raw)).toThrow(
      /articles\/test-article\.mdx/,
    );
    expect(() => parseArticleFile("test-article.mdx", raw)).toThrow(/title/);
  });

  it("fails on missing description", () => {
    const raw = validRaw().replace(
      'description: "A test description."\n',
      "",
    );
    expect(() => parseArticleFile("test-article.mdx", raw)).toThrow(
      /description/,
    );
  });

  it("fails on missing slug", () => {
    const raw = validRaw().replace('slug: "test-article"\n', "");
    expect(() => parseArticleFile("test-article.mdx", raw)).toThrow(/slug/);
  });

  it("fails on invalid date", () => {
    const raw = validRaw().replace('publishedAt: "2026-10-07"', 'publishedAt: "yesterday"');
    expect(() => parseArticleFile("test-article.mdx", raw)).toThrow(
      /publishedAt/,
    );
  });

  it("fails on invalid updatedAt", () => {
    const raw = validRaw('updatedAt: "not-a-date"\n');
    expect(() => parseArticleFile("test-article.mdx", raw)).toThrow(
      /updatedAt/,
    );
  });

  it("fails on filename/slug mismatch with both values", () => {
    const raw = validRaw().replace('slug: "test-article"', 'slug: "other-slug"');
    // Filename says test-article, slug says other-slug.
    expect(() => parseArticleFile("test-article.mdx", raw)).toThrow(
      /Filename\/slug mismatch/,
    );
    expect(() => parseArticleFile("test-article.mdx", raw)).toThrow(
      /other-slug/,
    );
  });

  it("fails on duplicate slugs with both filenames", () => {
    expect(() =>
      assertUniqueSlugs([
        { slug: "same-slug", fileName: "a-same.mdx" },
        { slug: "other", fileName: "other.mdx" },
        { slug: "same-slug", fileName: "b-same.mdx" },
      ]),
    ).toThrow(
      'Duplicate article slug "same-slug" found in articles/a-same.mdx and articles/b-same.mdx',
    );
    expect(() =>
      assertUniqueSlugs([
        { slug: "a", fileName: "a.mdx" },
        { slug: "b", fileName: "b.mdx" },
      ]),
    ).not.toThrow();
  });

  it("fails on invalid hero image path", () => {
    const raw = validRaw('heroImage: "public/images/articles/x.jpg"\n');
    expect(() => parseArticleFile("test-article.mdx", raw)).toThrow(
      /heroImage/,
    );
  });

  it("fails on malformed frontmatter", () => {
    const raw = `---\ntitle: [unclosed\n---\nBody`;
    expect(() => parseArticleFile("test-article.mdx", raw)).toThrow(
      /Malformed frontmatter|Invalid article/,
    );
  });
});

describe("articles — drafts", () => {
  it("excludes drafts from the default listing", () => {
    const raw = validRaw("draft: true\n");
    const parsed = parseArticleFile("test-article.mdx", raw);
    expect(parsed.meta.draft).toBe(true);
    // Real drafts on disk never appear in slugs/listings:
    for (const slug of getArticleSlugs()) {
      expect(getArticleBySlug(slug)?.draft).not.toBe(true);
    }
  });
});

describe("articles — frontmatter is stripped at render", () => {
  it("wires remark-frontmatter so YAML never renders as article text", () => {
    // @next/mdx does not strip frontmatter by default: without this plugin
    // the `---` fences render as <hr/> and key: value lines as paragraphs.
    const config = readSource("next.config.ts");
    expect(config).toContain("remark-frontmatter");
    const pkg = JSON.parse(readSource("package.json")) as {
      dependencies: Record<string, string>;
    };
    expect(pkg.dependencies["remark-frontmatter"]).toBeTruthy();
  });
});

describe("articles — routing contract", () => {
  it("resolves a valid slug and returns undefined for unknown slugs", () => {
    expect(getArticleBySlug("local-seo-pretoria-2026")).toBeDefined();
    expect(getArticleBySlug("no-such-article")).toBeUndefined();
  });

  it("wires the detail route to static params + notFound", () => {
    const route = readSource("app/articles/[slug]/page.tsx");
    expect(route).toContain("generateStaticParams");
    expect(route).toContain("notFound()");
    expect(route).toContain("dynamicParams");
  });

  it("keeps /blog as redirect-only (never canonical)", () => {
    const config = readSource("next.config.ts");
    expect(config).toContain('source: "/blog"');
    expect(config).toContain('destination: "/articles"');
    const sitemap = readSource("app/sitemap.ts");
    expect(sitemap).not.toContain('"/blog"');
  });
});

describe("articles — loader is server-side", () => {
  it("does not perform filesystem access from client components", () => {
    const block = readSource("components/mogen/blog-post-block.tsx");
    expect(block).not.toContain('"use client"');
    expect(block).not.toContain("node:fs");
  });

  it("loads metadata from frontmatter (no TS registry to edit)", () => {
    const blog = readSource("data/blog.ts");
    expect(blog).toContain("loadArticles");
    expect(blog).not.toContain("local-seo-pretoria-2026");
  });
});

describe("articles — local image path policy", () => {
  it("accepts local /images/articles/... web paths", () => {
    expect(
      isAllowedArticleImageSrc("/images/articles/example.jpg"),
    ).toBe(true);
    expect(isAllowedArticleImageSrc("/images/articles/a/b.webp")).toBe(true);
  });

  it("rejects filesystem paths, traversal and remote hosts", () => {
    expect(
      isAllowedArticleImageSrc("public/images/articles/example.jpg"),
    ).toBe(false);
    expect(
      isAllowedArticleImageSrc("/images/articles/../secret.jpg"),
    ).toBe(false);
    expect(
      isAllowedArticleImageSrc("https://example.com/x.jpg"),
    ).toBe(false);
    expect(isAllowedArticleImageSrc("/images/other/x.jpg")).toBe(false);
  });

  it("real articles use valid hero paths or none at all", () => {
    for (const article of loadArticles()) {
      if (article.meta.heroImage) {
        expect(
          isAllowedArticleImageSrc(article.meta.heroImage),
        ).toBe(true);
      }
    }
  });
});
