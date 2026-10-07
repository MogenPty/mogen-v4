import type { Metadata } from "next";
import { getSiteUrl, siteConfig } from "@/data/site";
import { canonicalUrl, pageMetadata } from "@/lib/seo";
import type { ArticleSummary } from "./types";

/**
 * Article metadata + structured data helpers.
 * Uses the existing Mogen metadata/canonical conventions (siteConfig.url
 * is the single source of truth — never hardcode the production host).
 */

export function articleCanonicalPath(slug: string): string {
  return `/articles/${slug}`;
}

export function articleCanonicalUrl(slug: string): string {
  return canonicalUrl(articleCanonicalPath(slug));
}

function absoluteImageUrl(path: string): string {
  if (/^https?:\/\//.test(path)) return path;
  const normalized = path.startsWith("/") ? path : `/${path}`;
  return `${getSiteUrl()}${normalized}`;
}

/** Page metadata driven entirely by MDX frontmatter. */
export function articleMetadata(article: ArticleSummary): Metadata {
  const path = articleCanonicalPath(article.slug);
  const base = pageMetadata({
    path,
    title: article.title,
    description: article.description,
    ogType: "article",
  });

  const image = article.heroImage;
  if (!image) return base;

  const absolute = absoluteImageUrl(image);
  return {
    ...base,
    openGraph: {
      ...base.openGraph,
      images: [
        {
          url: absolute,
          alt: article.heroImageAlt ?? article.title,
        },
      ],
    },
    twitter: {
      ...base.twitter,
      images: [absolute],
    },
  };
}

/**
 * Minimum Article JSON-LD mirroring visible content only: headline,
 * description, dates, author name and publisher. No invented ratings,
 * counts, credentials or images.
 */
export function articleJsonLd(article: ArticleSummary): Record<string, unknown> {
  const organizationId = `${siteConfig.url}/#organization`;
  const websiteId = `${siteConfig.url}/#website`;
  const pageUrl = articleCanonicalUrl(article.slug);
  const node: Record<string, unknown> = {
    "@type": "Article",
    "@id": `${pageUrl}#article`,
    headline: article.title,
    description: article.description,
    url: pageUrl,
    mainEntityOfPage: pageUrl,
    datePublished: article.publishedAt,
    author: { "@type": "Organization", name: article.author },
    publisher: { "@id": organizationId },
    isPartOf: { "@id": websiteId },
    inLanguage: siteConfig.lang,
  };
  if (article.updatedAt) node.dateModified = article.updatedAt;
  if (article.heroImage) node.image = [absoluteImageUrl(article.heroImage)];

  return {
    "@context": "https://schema.org",
    "@graph": [
      node,
      {
        "@type": "BreadcrumbList",
        itemListElement: [
          { "@type": "ListItem", position: 1, name: "Home", item: `${siteConfig.url}/` },
          {
            "@type": "ListItem",
            position: 2,
            name: "Articles",
            item: `${siteConfig.url}/articles`,
          },
          { "@type": "ListItem", position: 3, name: article.title, item: pageUrl },
        ],
      },
    ],
  };
}
