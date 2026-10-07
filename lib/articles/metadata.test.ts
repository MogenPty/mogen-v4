import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { getArticleBySlug } from "@/lib/articles/loader";
import { articleJsonLd, articleMetadata } from "@/lib/articles/metadata";

function readSource(relativePath: string): string {
  return readFileSync(join(process.cwd(), relativePath), "utf8");
}

describe("article metadata — driven by frontmatter", () => {
  it("takes title and description from frontmatter", () => {
    const article = getArticleBySlug("local-seo-pretoria-2026")!;
    const meta = articleMetadata(article);
    expect(meta.title).toBe(article.title);
    expect(meta.description).toBe(article.description);
  });

  it("exposes OG title/description from the article", () => {
    const article = getArticleBySlug("core-web-vitals-guide")!;
    const meta = articleMetadata(article);
    const og = meta.openGraph;
    expect(og).toBeDefined();
    if (og && typeof og === "object" && "title" in og) {
      expect(og.title).toBe(article.title);
      expect(og.description).toBe(article.description);
    }
  });

  it("uses the hero image for OG/Twitter when available", () => {
    const hero = {
      ...getArticleBySlug("local-seo-pretoria-2026")!,
      heroImage: "/images/articles/example.jpg",
      heroImageAlt: "Example",
    };
    const meta = articleMetadata(hero);
    const images =
      meta.openGraph && typeof meta.openGraph === "object" && "images" in meta.openGraph
        ? (meta.openGraph.images as { url: string }[])
        : [];
    expect(images.length).toBeGreaterThan(0);
    expect(images[0].url).toContain("/images/articles/example.jpg");
    expect(images[0].url).toMatch(/^https?:\/\//);
  });

  it("falls back to the site OG image when no hero image exists", () => {
    const article = getArticleBySlug("local-seo-pretoria-2026")!;
    expect(article.heroImage).toBeUndefined();
    const meta = articleMetadata(article);
    const images =
      meta.openGraph && typeof meta.openGraph === "object" && "images" in meta.openGraph
        ? (meta.openGraph.images as { url: string }[])
        : [];
    expect(images.length).toBeGreaterThan(0);
  });

  it("sets a canonical URL per article", () => {
    const article = getArticleBySlug("local-seo-pretoria-2026")!;
    const meta = articleMetadata(article);
    const canonical = meta.alternates?.canonical;
    const url =
      typeof canonical === "string"
        ? canonical
        : Array.isArray(canonical)
          ? canonical[0]?.url
          : (canonical as { url?: string } | undefined)?.url;
    expect(url).toContain("/articles/local-seo-pretoria-2026");
  });

  it("derives the host from site config (never hardcoded)", () => {
    const metadataSource = readSource("lib/articles/metadata.ts");
    expect(metadataSource).not.toContain("www.mogen.co.za");
    expect(metadataSource).toContain("siteConfig");
    const route = readSource("app/articles/[slug]/page.tsx");
    expect(route).not.toContain("www.mogen.co.za");
  });
});

describe("article structured data — minimum Article JSON-LD", () => {
  it("mirrors visible content only (no fabricated claims)", () => {
    const article = getArticleBySlug("local-seo-pretoria-2026")!;
    const json = JSON.stringify(articleJsonLd(article));
    expect(json).toContain(article.title);
    expect(json).toContain(article.publishedAt);
    expect(json).toContain("BreadcrumbList");
    expect(json).not.toMatch(/aggregateRating/i);
    expect(json).not.toMatch(/review/i);
  });

  it("includes dateModified and image only when the article has them", () => {
    const plain = getArticleBySlug("local-seo-pretoria-2026")!;
    expect(JSON.stringify(articleJsonLd(plain))).not.toContain("dateModified");
    const updated = { ...plain, updatedAt: "2026-10-01" };
    expect(JSON.stringify(articleJsonLd(updated))).toContain("dateModified");
    const withHero = {
      ...plain,
      heroImage: "/images/articles/example.jpg",
    };
    expect(JSON.stringify(articleJsonLd(withHero))).toContain(
      "/images/articles/example.jpg",
    );
  });
});
