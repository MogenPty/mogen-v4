import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import sitemap from "@/app/sitemap";
import { getSiteUrl } from "@/data/site";
import {
  getAllArticles,
  getArticleBySlug,
  getArticleSlugs,
  loadArticles,
  parseArticleFile,
} from "@/lib/articles/loader";

const KNOWN_SLUG = "web-development-in-the-brits-area";

function mdxFilesOnDisk(): string[] {
  return readdirSync(join(process.cwd(), "articles"))
    .filter((f) => f.endsWith(".mdx"))
    .sort((a, b) => a.localeCompare(b));
}

function generatedEntries(): { fileName: string; raw: string }[] {
  return JSON.parse(
    readFileSync(
      join(process.cwd(), "lib", "articles", "generated-index.json"),
      "utf8",
    ),
  ) as { fileName: string; raw: string }[];
}

describe("articles — canonical discovery (fs vs generated index)", () => {
  it("generated index mirrors the MDX files on disk", () => {
    const onDisk = mdxFilesOnDisk();
    expect(onDisk.length).toBeGreaterThan(0);
    const generated = generatedEntries().map((e) => e.fileName);
    expect(generated).toEqual(onDisk);
    for (const entry of generatedEntries()) {
      // Compare the parsed slug (quoting-agnostic) rather than requiring a
      // particular YAML quoting style in the raw frontmatter. Parsing also
      // re-validates each embedded file (missing title etc. throws here).
      const parsed = parseArticleFile(entry.fileName, entry.raw);
      expect(parsed.meta.slug).toBe(entry.fileName.replace(/\.mdx$/, ""));
    }
  });

  it("discovers published MDX files through the generated (production) source", () => {
    const slugs = getArticleSlugs({ source: "generated" });
    expect(slugs.length).toBeGreaterThan(0);
    expect(slugs).toContain(KNOWN_SLUG);
  });

  it("fs and generated sources agree on the published article set", () => {
    const fromFs = getArticleSlugs({ source: "fs" }).sort();
    const fromGenerated = getArticleSlugs({ source: "generated" }).sort();
    expect(fromGenerated).toEqual(fromFs);
  });

  it("getAllArticles() returns the known article with sitemap-ready dates", () => {
    const all = getAllArticles({ source: "generated" });
    const known = all.find((a) => a.slug === KNOWN_SLUG);
    expect(known).toBeDefined();
    expect(known?.title).toBeTruthy();
    expect(known?.description).toBeTruthy();
    expect(known?.publishedAt).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it("known slug resolves through both sources", () => {
    expect(getArticleBySlug(KNOWN_SLUG, { source: "fs" })).toBeDefined();
    expect(
      getArticleBySlug(KNOWN_SLUG, { source: "generated" }),
    ).toBeDefined();
    expect(getArticleBySlug("no-such-article", { source: "generated" }))
      .toBeUndefined();
  });
});

describe("articles — sitemap agreement", () => {
  it("contains the known article URL with lastModified from frontmatter", () => {
    const entries = sitemap();
    const known = getArticleBySlug(KNOWN_SLUG, { source: "generated" });
    expect(known).toBeDefined();
    const expected = `${getSiteUrl()}/articles/${KNOWN_SLUG}`;
    const match = entries.find((e) => e.url === expected);
    expect(match).toBeDefined();
    const expectedDate = new Date(known?.updatedAt ?? known?.publishedAt ?? "");
    expect(new Date(match?.lastModified ?? 0).getTime()).toBe(
      expectedDate.getTime(),
    );
  });

  it("article URL set matches the canonical loader (index and sitemap agree)", () => {
    const loaderUrls = new Set(
      getAllArticles({ source: "generated" }).map(
        (a) => `${getSiteUrl()}/articles/${a.slug}`,
      ),
    );
    const sitemapArticleUrls = sitemap()
      .map((e) => e.url)
      .filter(
        (url) =>
          url.startsWith(`${getSiteUrl()}/articles/`) &&
          url !== `${getSiteUrl()}/articles`,
      );
    expect(new Set(sitemapArticleUrls)).toEqual(loaderUrls);
    expect(sitemapArticleUrls.length).toBeGreaterThan(0);
  });

  it("never emits pagination URLs into the sitemap", () => {
    for (const entry of sitemap()) {
      expect(entry.url).not.toContain("?page=");
    }
  });
});

describe("articles — drafts and failure visibility", () => {
  it("excludes drafts from listings regardless of source", () => {
    for (const source of ["fs", "generated"] as const) {
      for (const article of loadArticles({ source })) {
        expect(article.meta.draft).not.toBe(true);
      }
      for (const slug of getArticleSlugs({ source })) {
        expect(getArticleBySlug(slug, { source })?.draft).not.toBe(true);
      }
    }
  });

  it("fails loudly (never silent []) when the filesystem source is absent", () => {
    expect(() =>
      loadArticles({ source: "fs", cwd: join(process.cwd(), "__no_such_dir__") }),
    ).toThrow(/Article source directory not found/);
  });
});
