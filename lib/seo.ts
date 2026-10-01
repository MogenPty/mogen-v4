import type { Metadata } from "next";
import { getSiteUrl, siteConfig } from "@/data/site";

/**
 * Shared SEO helpers for Task 8.
 *
 * All absolute URLs derive from `siteConfig.url`, which itself resolves from
 * `NEXT_PUBLIC_SITE_URL` (see `data/site.ts`). Never hardcode a host here.
 */

/** Normalize a pathname: leading slash, no trailing slash (except root), no query. */
export function normalizePath(path: string): string {
  const withoutQuery = path.split("?")[0].split("#")[0];
  const withLeading = withoutQuery.startsWith("/")
    ? withoutQuery
    : `/${withoutQuery}`;
  if (withLeading.length > 1) return withLeading.replace(/\/+$/, "");
  return "/";
}

/** Absolute canonical URL for a public pathname. Strips query/hash. */
export function canonicalUrl(path: string): string {
  const base = getSiteUrl();
  const normalized = normalizePath(path);
  if (normalized === "/") return `${base}/`;
  return `${base}${normalized}`;
}

interface PageMetadataOptions {
  /** Public pathname, e.g. `/services/seo`. Query strings are stripped. */
  path: string;
  /**
   * Short page title — the root layout template appends `| Mogen`.
   * Do NOT include `— Mogen` or `| Mogen` here (that caused `Mogen | Mogen`).
   */
  title: string;
  description: string;
  /** Open Graph type. Defaults to `website`; articles/promotions override. */
  ogType?: "website" | "article";
}

/**
 * Build consistent page metadata: canonical + Open Graph + Twitter,
 * all derived from the configured site URL.
 */
export function pageMetadata({
  path,
  title,
  description,
  ogType = "website",
}: PageMetadataOptions): Metadata {
  const canonical = canonicalUrl(path);
  return {
    title,
    description,
    alternates: { canonical },
    openGraph: {
      type: ogType,
      url: canonical,
      siteName: siteConfig.name,
      title,
      description,
      images: [
        {
          url: siteConfig.ogImage,
          width: siteConfig.ogImageWidth,
          height: siteConfig.ogImageHeight,
          alt: siteConfig.ogImageAlt,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [siteConfig.ogImage],
    },
  };
}
