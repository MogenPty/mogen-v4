import type { Metadata } from "next";
import BlogBlock from "@/components/mogen/blog-block";
import { getArticles, parsePageParam } from "@/data/blog";
import { getSiteUrl } from "@/data/site";
import { pageMetadata } from "@/lib/seo";

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

export async function generateMetadata({ searchParams }: Props): Promise<Metadata> {
  const params = await searchParams;
  const page = parsePageParam(firstParam(params.page));
  const base = pageMetadata({
    path: "/articles",
    title: "Articles",
    description:
      "Industry articles and practical growth advice for South African businesses — local SEO, websites, Google Business Profile and conversion.",
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
  const preservedParams: Record<string, string | string[] | undefined> = {
    ...params,
  };
  delete preservedParams.page;
  return <BlogBlock numbering={9} page={page} preservedParams={preservedParams} />;
}
