import { readFileSync } from "node:fs";
import { join } from "node:path";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { MdxImg } from "@/components/mogen/article-image";

function readSource(relativePath: string): string {
  return readFileSync(join(process.cwd(), relativePath), "utf8");
}

describe("article images — Markdown maps to the Mogen image component", () => {
  it("registers an img mapping in mdx-components.tsx", () => {
    const registry = readSource("mdx-components.tsx");
    expect(registry).toContain("img:");
    expect(registry).toContain("MdxImg");
    expect(registry).toContain("ArticleImage");
  });

  it("backs ArticleImage with next/image", () => {
    const source = readSource("components/mogen/article-image.tsx");
    expect(source).toContain('from "next/image"');
    expect(source).toContain("<Image");
    expect(source).not.toContain("<img");
  });

  it("never asks authors to import next/image in Markdown", () => {
    const docs = readSource("docs/articles.md");
    expect(docs).toContain("![");
    expect(docs).not.toMatch(/import Image from "next\/image"/);
  });

  it("preserves local /images/articles/... paths and alt text", () => {
    const source = readSource("components/mogen/article-image.tsx");
    // The Markdown mapping forwards src/alt/title through unchanged.
    expect(source).toContain("MdxImg");
    expect(source).toContain("alt={alt");
    expect(source).toContain("src={src}");
    expect(source).toContain("caption={title");
  });

  it("renders a Markdown image to an optimized img with alt + src intact", () => {
    const html = renderToStaticMarkup(
      createElement(MdxImg, {
        src: "/images/articles/example.jpg",
        alt: "Example description",
      }),
    );
    expect(html).toContain('alt="Example description"');
    // next/image optimizes the local path (URL-encoded) with a srcset —
    // the article path survives optimization instead of being dropped.
    expect(html).toContain("%2Fimages%2Farticles%2Fexample.jpg");
    expect(html).toContain("srcSet");
    expect(html).toContain('loading="lazy"');
  });

  it("keeps layout stable without author-supplied dimensions", () => {
    const source = readSource("components/mogen/article-image.tsx");
    // Fill mode inside a fixed-ratio wrapper: responsive + no layout shift.
    expect(source).toContain("aspectRatio");
    expect(source).toContain("fill");
  });

  it("supports explicit width/height via ArticleImage", () => {
    const source = readSource("components/mogen/article-image.tsx");
    expect(source).toContain("width");
    expect(source).toContain("height");
    const docs = readSource("docs/articles.md");
    expect(docs).toContain("<ArticleImage");
  });

  it("validates image paths against /images/articles/", () => {
    const source = readSource("components/mogen/article-image.tsx");
    expect(source).toContain("isAllowedArticleImageSrc");
  });
});
