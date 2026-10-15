import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import ArticleCard from "@/components/mogen/article-card";
import BlueprintGrid from "@/components/mogen/blueprint-grid";
import PageShell from "@/components/mogen/page-shell";
import PaginationNav from "@/components/mogen/pagination-nav";
import {
  buildArticlesPageUrl,
  getArticlesPageSize,
  getPaginationControls,
  parsePageParam,
} from "@/data/blog";
import { getAllArticles } from "@/lib/articles/loader";
import { getTagArchives, tagArchivePath } from "@/lib/articles/tags";
import { getPaginationSettings } from "@/lib/pagination/config";
import { canonicalUrl, pageMetadata } from "@/lib/seo";

interface Props {
  params: Promise<{ tag: string }>;
  searchParams: Promise<{ page?: string | string[] }>;
}

export const dynamicParams = true;

// Tag archives refresh at most hourly so scheduled articles join their
// archive when eligible, without a redeploy (see docs/articles.md).
export const revalidate = 3600;

/** Published tag archives keyed by slug (canonical loader — no leaks). */
function publishedArchives() {
  return getTagArchives(getAllArticles());
}

export function generateStaticParams() {
  return [...publishedArchives().keys()].map((tag) => ({ tag }));
}

function firstParam(value: string | string[] | undefined): string | undefined {
  if (Array.isArray(value)) return value[0];
  return value;
}

export async function generateMetadata({
  params,
  searchParams,
}: Props): Promise<Metadata> {
  const { tag } = await params;
  const slug = decodeURIComponent(tag);
  const archive = publishedArchives().get(slug);
  if (!archive || archive.articles.length === 0) {
    return { title: "Tag not found" };
  }
  const path = tagArchivePath(slug);
  const base = pageMetadata({
    path,
    title: `Articles tagged "${archive.label}"`,
    description: `Published Mogen articles tagged ${archive.label} — practical growth advice for South African businesses.`,
  });
  const page = parsePageParam(firstParam((await searchParams).page));
  const canonical =
    page > 1 ? `${canonicalUrl(path)}?page=${page}` : canonicalUrl(path);
  // Thin archives (a single article) stay out of the index; useful
  // multi-article archives remain indexable. No metadata leaks either way:
  // only published articles are counted here.
  if (archive.articles.length < 2) {
    return {
      ...base,
      alternates: { canonical },
      robots: { index: false, follow: true },
    };
  }
  return { ...base, alternates: { canonical } };
}

export default async function TagArchivePage({ params, searchParams }: Props) {
  const { tag } = await params;
  const slug = decodeURIComponent(tag);
  const archive = publishedArchives().get(slug);
  // Unknown tags (or tags with no eligible published articles) 404 —
  // never a misleading empty archive.
  if (!archive || archive.articles.length === 0) notFound();

  const query = await searchParams;
  const requestedPage = parsePageParam(firstParam(query.page));
  const totalItems = archive.articles.length;
  const pageSize = getArticlesPageSize();
  const totalPages = Math.ceil(totalItems / pageSize);
  const currentPage = Math.min(Math.max(1, requestedPage), totalPages);
  if (requestedPage !== currentPage) notFound();
  const basePath = tagArchivePath(slug);
  const items = archive.articles.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize,
  );
  const settings = getPaginationSettings();
  const controls = getPaginationControls(
    currentPage,
    totalPages,
    settings.ends,
  );

  return (
    <PageShell
      index="// 01 — Insights"
      label={`Tag · ${archive.label}`}
      title={
        <>
          {archive.label}
          <span className="text-catalyst">.</span>
        </>
      }
      intro={`${totalItems} published ${totalItems === 1 ? "article" : "articles"} tagged ${archive.label}.`}
    >
      <BlueprintGrid className="bg-bone pb-24">
        <div className="mx-auto max-w-[1600px] px-6 lg:px-10">
          <Link
            href="/articles"
            className="small-caps mb-8 inline-flex items-center gap-2 text-ink/60 hover:text-catalyst"
          >
            ← Back to articles
          </Link>
          <div className="grid grid-cols-1 gap-px bg-ink/10 md:grid-cols-2 lg:grid-cols-3">
            {items.map((article) => (
              <ArticleCard key={article.slug} article={article} />
            ))}
          </div>
          {totalPages > 1 && (
            <PaginationNav
              currentPage={currentPage}
              totalPages={totalPages}
              controls={controls}
              layout={settings.style}
              navAriaLabel={`Articles tagged ${archive.label} pagination`}
              hrefForPage={(p) =>
                buildArticlesPageUrl(p, undefined, basePath)
              }
              labels={{
                first: "Go to first tag page",
                previous: "Go to previous tag page",
                next: "Go to next tag page",
                last: "Go to last tag page",
                page: (n) => `Go to tag page ${n}`,
              }}
            />
          )}
        </div>
      </BlueprintGrid>
    </PageShell>
  );
}
