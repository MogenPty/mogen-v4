import type { Metadata } from "next";
import { notFound } from "next/navigation";
import BlogBlock from "@/components/mogen/blog-block";
import { getArticles, parsePageParam } from "@/data/blog";
import { getSiteUrl, siteConfig } from "@/data/site";
import { pageMetadata } from "@/lib/seo";
import { STATIC_META } from "@/lib/seo/metadata-registry";

interface ArticlesSearchParams {
  page?: string | string[];
  [key: string]: string | string[] | undefined;
}

interface Props {
  searchParams: Promise<ArticlesSearchParams>;
}

function firstParam(value: string | string[] | undefined): string | undefined {
  if (Array.isArray(value)) return value[0];
  return value;
}

export async function generateMetadata({
  searchParams,
}: Props): Promise<Metadata> {
  const params = await searchParams;
  const page = parsePageParam(firstParam(params.page));
  const base = pageMetadata({
    path: "/articles",
    title: STATIC_META["/articles"].title,
    description: STATIC_META["/articles"].description,
  });
  // First page stays canonical at /articles; deeper pages are distinct
  // paginated listing URLs (never injected into the article sitemap).
  // Use the clamped page so the canonical always matches rendered content.
  const { currentPage } = getArticles({ page });
  if (currentPage > 1) {
    const canonical = `${getSiteUrl()}/articles?page=${currentPage}`;
    return { ...base, alternates: { canonical } };
  }
  return base;
}

export default async function Articles({ searchParams }: Props) {
  const params = await searchParams;
  const page = parsePageParam(firstParam(params.page));
  // A page number beyond the available range is a predictable 404 (not a
  // silently clamped duplicate of the last page). Invalid values
  // (?page=abc, 0, -3) already normalise to 1 via parsePageParam.
  const { currentPage, totalPages } = getArticles({ page });
  if (totalPages > 0 && page !== currentPage) notFound();
  const preservedParams: Record<string, string | string[] | undefined> = {
    ...params,
  };
  delete preservedParams.page;
  return (
    <>
      <ArticlesIndexJsonLd />
      <BlogBlock numbering={9} page={page} preservedParams={preservedParams} />
    </>
  );
}

function ArticlesIndexJsonLd() {
  const pageUrl = `${siteConfig.url}/articles`;
  // Collection schema only — per-article Article JSON-LD lives on detail pages.
  const graph = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "CollectionPage",
        "@id": `${pageUrl}#webpage`,
        url: pageUrl,
        name: `${STATIC_META["/articles"].title} | ${siteConfig.name}`,
        description: STATIC_META["/articles"].description,
        isPartOf: { "@id": `${siteConfig.url}/#website` },
        about: { "@id": `${siteConfig.url}/#organization` },
        publisher: { "@id": `${siteConfig.url}/#organization` },
        inLanguage: siteConfig.lang,
      },
    ],
  };
  return (
    <script
      type="application/ld+json"
      // biome-ignore lint/security/noDangerouslySetInnerHtml: No workaround for JSON-LD injection
      dangerouslySetInnerHTML={{ __html: JSON.stringify(graph) }}
    />
  );
}
