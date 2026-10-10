import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import ArticleCard from "@/components/mogen/article-card";
import BlueprintGrid from "@/components/mogen/blueprint-grid";
import PageShell from "@/components/mogen/page-shell";
import {
  ARTICLES_PAGE_SIZE,
  buildArticlesPageUrl,
  getPageNumbers,
  parsePageParam,
} from "@/data/blog";
import { getAllArticles } from "@/lib/articles/loader";
import { getTagArchives, tagArchivePath } from "@/lib/articles/tags";
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
  const totalPages = Math.ceil(totalItems / ARTICLES_PAGE_SIZE);
  const currentPage = Math.min(Math.max(1, requestedPage), totalPages);
  if (requestedPage !== currentPage) notFound();
  const basePath = tagArchivePath(slug);
  const items = archive.articles.slice(
    (currentPage - 1) * ARTICLES_PAGE_SIZE,
    currentPage * ARTICLES_PAGE_SIZE,
  );
  const pageNumbers =
    totalPages > 1 ? getPageNumbers(currentPage, totalPages) : [];

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
            <nav
              aria-label={`Articles tagged ${archive.label} pagination`}
              className="mt-12 flex flex-wrap items-center justify-center gap-2"
            >
              <TagPageLink
                page={currentPage - 1}
                basePath={basePath}
                label="Previous"
                ariaLabel="Go to previous tag page"
                isDisabled={currentPage <= 1}
              />
              {pageNumbers.map((n, i) =>
                n === "…" ? (
                  <span
                    key={`ellipsis-${i}`}
                    aria-hidden="true"
                    className="small-caps px-1 text-ink/40"
                  >
                    …
                  </span>
                ) : (
                  <TagPageLink
                    key={n}
                    page={n}
                    basePath={basePath}
                    label={String(n)}
                    ariaLabel={`Go to tag page ${n}`}
                    isCurrent={n === currentPage}
                  />
                ),
              )}
              <TagPageLink
                page={currentPage + 1}
                basePath={basePath}
                label="Next"
                ariaLabel="Go to next tag page"
                isDisabled={currentPage >= totalPages}
              />
            </nav>
          )}
        </div>
      </BlueprintGrid>
    </PageShell>
  );
}

function TagPageLink({
  page,
  basePath,
  label,
  ariaLabel,
  isCurrent,
  isDisabled,
}: Readonly<{
  page: number;
  basePath: string;
  label: React.ReactNode;
  ariaLabel?: string;
  isCurrent?: boolean;
  isDisabled?: boolean;
}>) {
  const base =
    "small-caps inline-flex min-h-11 min-w-11 items-center justify-center border px-4 py-2 transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-catalyst";
  if (isDisabled) {
    return (
      <span
        aria-disabled="true"
        className={`${base} cursor-not-allowed border-ink/10 text-ink/30`}
      >
        {label}
      </span>
    );
  }
  return (
    <Link
      href={buildArticlesPageUrl(page, undefined, basePath)}
      aria-label={ariaLabel}
      aria-current={isCurrent ? "page" : undefined}
      className={`${base} ${
        isCurrent
          ? "border-ink bg-ink text-bone"
          : "border-ink/15 text-ink/70 hover:border-ink hover:text-ink"
      }`}
    >
      {label}
    </Link>
  );
}
