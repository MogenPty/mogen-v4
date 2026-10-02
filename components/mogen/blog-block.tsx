import { ArrowRight, Clock } from "lucide-react";
import Link from "next/link";
import {
  ARTICLES_PAGE_SIZE,
  buildArticlesPageUrl,
  getArticles,
  getLatestFeaturedPost,
  getPageNumbers,
  POSTS,
} from "@/data/blog";
import { formatNumber } from "@/lib/utils";
import BlueprintGrid from "./blueprint-grid";
import MagneticButton from "./magnet-button";
import PageShell from "./page-shell";

interface Props {
  numbering?: number;
  /** 1-based page for the normal listing. Clamped safely by the data layer. */
  page?: number;
  pageSize?: number;
  /** Legitimate query params to preserve in pagination links (excluding `page`). */
  preservedParams?: Record<string, string | string[] | undefined>;
}

function PaginationLink({
  page,
  preservedParams,
  label,
  ariaLabel,
  isCurrent,
  isDisabled,
}: Readonly<{
  page: number;
  preservedParams?: Record<string, string | string[] | undefined>;
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
      href={buildArticlesPageUrl(page, preservedParams)}
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

export default function BlogBlock({
  numbering = 1,
  page = 1,
  pageSize = ARTICLES_PAGE_SIZE,
  preservedParams,
}: Readonly<Props>) {
  const featured = getLatestFeaturedPost(POSTS);
  const result = getArticles({ page, pageSize });
  const showFeatured = result.currentPage === 1 && featured !== undefined;
  const pageNumbers =
    result.totalPages > 1
      ? getPageNumbers(result.currentPage, result.totalPages)
      : [];

  return (
    <PageShell
      index={`// ${formatNumber(numbering)} — Insights`}
      label="Articles & Insights"
      title={
        <>
          Growth, <span className="text-catalyst">decoded.</span>
        </>
      }
      intro="Industry articles and practical growth advice — built for local South African businesses that want to rank, convert and grow."
    >
      {/* Featured — latest explicitly featured article, first page only */}
      {showFeatured && featured && (
        <BlueprintGrid id={"featured_post"} className="bg-bone pb-16">
          <div className="mx-auto max-w-[1600px] px-6 lg:px-10">
            <Link
              href={`/articles/${featured.slug}`}
              className="group grid grid-cols-1 gap-8 border border-ink/10 bg-bone p-6 transition-colors hover:bg-ink hover:text-bone lg:grid-cols-2 lg:p-10"
            >
              <div className="flex flex-col justify-between">
                <div>
                  <span className="small-caps text-catalyst">
                    {featured.category} · Featured
                  </span>
                  <h2 className="mt-4 font-display text-3xl font-black leading-tight lg:text-5xl text-balance">
                    {featured.title}
                  </h2>
                  <p className="mt-4 max-w-md text-sm opacity-80">
                    {featured.excerpt}
                  </p>
                </div>
                <div className="mt-8 flex items-center gap-4 text-sm opacity-70">
                  <span>{featured.author}</span>
                  <span>·</span>
                  <span>{featured.date}</span>
                  <span>·</span>
                  <span className="flex items-center gap-1">
                    <Clock className="h-3 w-3" /> {featured.readTime}
                  </span>
                </div>
              </div>
              <div className="flex items-end justify-end">
                <span className="small-caps flex items-center gap-2 text-catalyst">
                  Read article{" "}
                  <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                </span>
              </div>
            </Link>
          </div>
        </BlueprintGrid>
      )}

      {/* Article grid */}
      <BlueprintGrid className="bg-bone pb-24">
        <div className="mx-auto max-w-[1600px] px-6 lg:px-10">
          {result.totalItems === 0 ? (
            <div className="border border-ink/10 bg-bone p-10 text-center">
              <h2 className="font-display text-2xl font-black text-ink">
                No articles yet
              </h2>
              <p className="mx-auto mt-3 max-w-md text-sm text-ink/70">
                We are preparing practical growth advice for South African
                businesses. Please check back soon.
              </p>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 gap-px bg-ink/10 md:grid-cols-2 lg:grid-cols-3">
                {result.items.map((p) => (
                  <Link
                    key={p.slug}
                    href={`/articles/${p.slug}`}
                    className="group flex flex-col bg-bone p-8 transition-colors hover:bg-ink hover:text-bone"
                  >
                    <span className="small-caps text-catalyst">
                      {p.category}
                    </span>
                    <h3 className="mt-4 font-display text-xl font-black leading-tight">
                      {p.title}
                    </h3>
                    <p className="mt-3 flex-1 text-sm opacity-80">{p.excerpt}</p>
                    <div className="mt-6 flex items-center justify-between text-xs opacity-60">
                      <span>{p.date}</span>
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3" /> {p.readTime}
                      </span>
                    </div>
                  </Link>
                ))}
              </div>

              {result.totalPages > 1 && (
                <nav
                  aria-label="Articles pagination"
                  className="mt-12 flex flex-wrap items-center justify-center gap-2"
                >
                  <PaginationLink
                    page={result.currentPage - 1}
                    preservedParams={preservedParams}
                    label="Previous"
                    ariaLabel="Go to previous articles page"
                    isDisabled={result.currentPage <= 1}
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
                      <PaginationLink
                        key={n}
                        page={n}
                        preservedParams={preservedParams}
                        label={String(n)}
                        ariaLabel={`Go to articles page ${n}`}
                        isCurrent={n === result.currentPage}
                      />
                    ),
                  )}
                  <PaginationLink
                    page={result.currentPage + 1}
                    preservedParams={preservedParams}
                    label="Next"
                    ariaLabel="Go to next articles page"
                    isDisabled={result.currentPage >= result.totalPages}
                  />
                </nav>
              )}
            </>
          )}
        </div>
      </BlueprintGrid>

      {/* CTA */}
      <BlueprintGrid className="bg-catalyst py-20 text-white">
        <div className="mx-auto flex max-w-[1600px] flex-col items-start justify-between gap-6 px-6 lg:flex-row lg:items-center lg:px-10">
          <h2 className="font-display text-3xl font-black lg:text-5xl text-balance">
            Want this growth working for you?
          </h2>
          <div className="flex flex-col gap-3 sm:flex-row">
            <MagneticButton
              as="a"
              href="/#audit"
              variant="solid"
              className="bg-ink text-bone hover:bg-bone hover:text-ink"
            >
              Get Free Audit
            </MagneticButton>
            <MagneticButton
              as="a"
              href="/contact"
              variant="outline"
              className="border-white/60 text-white hover:bg-white hover:text-ink dark:hover:text-black"
            >
              Talk to Us
            </MagneticButton>
          </div>
        </div>
      </BlueprintGrid>
    </PageShell>
  );
}
