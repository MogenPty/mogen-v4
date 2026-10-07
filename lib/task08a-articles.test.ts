import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { getPost, POSTS } from "@/data/blog";

function readSource(relativePath: string): string {
  return readFileSync(join(process.cwd(), relativePath), "utf8");
}

describe("task 8A — /blog migrates to /articles", () => {
  it("provides /articles listing and detail routes", () => {
    expect(readSource("app/articles/page.tsx")).toContain('path: "/articles"');
    expect(readSource("app/articles/page.tsx")).toContain('title: "Articles"');
    expect(readSource("app/articles/[slug]/page.tsx")).toContain(
      "generateMetadata",
    );
    expect(readSource("app/articles/[slug]/page.tsx")).toContain("notFound()");
  });

  it("permanently redirects /blog and /blog/:slug generically", () => {
    const source = readSource("next.config.ts");
    expect(source).toContain('source: "/blog"');
    expect(source).toContain('destination: "/articles"');
    expect(source).toContain('source: "/blog/:slug"');
    expect(source).toContain('destination: "/articles/:slug"');
    // Server-level permanent redirects (query strings preserved by default).
    expect(source).toContain("permanent: true");
  });

  it("keeps article slugs unchanged", () => {
    expect(POSTS.length).toBeGreaterThan(0);
    for (const post of POSTS) {
      expect(post.slug).toBeTruthy();
      expect(post.slug).not.toContain("blog");
      expect(getPost(post.slug)).toBeDefined();
    }
  });

  it("uses canonical /articles URLs in sitemap, metadata and JSON-LD", () => {
    const sitemap = readSource("app/sitemap.ts");
    expect(sitemap).toContain("/articles");
    // No public /blog route URLs in the sitemap (the "@/data/blog" data
    // module import is internal and intentionally retained per §12).
    expect(sitemap).not.toContain('"/blog"');
    expect(sitemap).not.toContain("`/blog");
    expect(sitemap).not.toContain("/blog/");
    expect(sitemap).not.toContain("/blog`");
    // Canonical article URLs are built from MDX frontmatter slugs in the
    // shared metadata helper consumed by the detail route.
    const helper = readSource("lib/articles/metadata.ts");
    expect(helper).toContain("/articles/${slug}");
    expect(helper).not.toContain("/blog/${slug}");
    expect(helper).not.toContain('"/blog"');
    expect(helper).not.toContain("/blog/");
    expect(helper).toContain('"Articles"');
    const detail = readSource("app/articles/[slug]/page.tsx");
    expect(detail).toContain("articleMetadata");
    expect(detail).not.toContain("/blog/${slug}");
    expect(detail).not.toContain('"/blog"');
    expect(detail).not.toContain("/blog/");
  });

  it("points internal navigation at /articles, not /blog", () => {
    for (const file of [
      "components/mogen/nav.tsx",
      "components/mogen/footer.tsx",
      "components/mogen/articles-preview.tsx",
      "components/mogen/blog-block.tsx",
      "components/mogen/blog-post-block.tsx",
      "components/mogen/article-not-found.tsx",
      "app/about/page.tsx",
    ]) {
      const source = readSource(file);
      expect(source).not.toContain('"/blog"');
      expect(source).not.toContain("`/blog/");
      expect(source).not.toContain('href="/blog"');
    }
    expect(readSource("components/mogen/nav.tsx")).toContain("/articles");
    expect(readSource("components/mogen/footer.tsx")).toContain("/articles");
  });
});
