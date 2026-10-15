import Link from "next/link";
import type { PaginationControls } from "@/data/blog";
import type { PaginationStyle } from "@/lib/pagination/config";

export interface PaginationNavLabels {
  first: string;
  previous: string;
  next: string;
  last: string;
  page: (page: number) => string;
}

interface Props {
  currentPage: number;
  totalPages: number;
  controls: PaginationControls;
  /** `condensed` centres every control in one row; `justified` spreads the
   * three groups — (First, Previous), numbers, (Next, Last) — full width. */
  layout: PaginationStyle;
  navAriaLabel: string;
  hrefForPage: (page: number) => string;
  labels: PaginationNavLabels;
}

function NavLink({
  page,
  hrefForPage,
  label,
  ariaLabel,
  isCurrent,
  isDisabled,
}: Readonly<{
  page: number;
  hrefForPage: (page: number) => string;
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
      href={hrefForPage(page)}
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

/**
 * Shared pagination navigation for every paginated listing (articles
 * index, tag archives, and any future paginated section). One component
 * so layout (`PAGINATION_STYLE`) and boundary behaviour
 * (`PAGINATION_ENDS`, pre-resolved into `controls`) can never diverge
 * between sections.
 */
export default function PaginationNav({
  currentPage,
  totalPages,
  controls,
  layout,
  navAriaLabel,
  hrefForPage,
  labels,
}: Readonly<Props>) {
  const startGroup = (
    <>
      {controls.showFirst && (
        <NavLink
          page={1}
          hrefForPage={hrefForPage}
          label="First"
          ariaLabel={labels.first}
          isDisabled={controls.firstDisabled}
        />
      )}
      {controls.showPrevious && (
        <NavLink
          page={currentPage - 1}
          hrefForPage={hrefForPage}
          label="Previous"
          ariaLabel={labels.previous}
          isDisabled={controls.previousDisabled}
        />
      )}
    </>
  );
  const numbersGroup = (
    <>
      {controls.pageNumbers.map((n, i) =>
        n === "…" ? (
          <span
            key={`ellipsis-${i}`}
            aria-hidden="true"
            className="small-caps px-1 text-ink/40"
          >
            …
          </span>
        ) : (
          <NavLink
            key={n}
            page={n}
            hrefForPage={hrefForPage}
            label={String(n)}
            ariaLabel={labels.page(n)}
            isCurrent={n === currentPage}
          />
        ),
      )}
    </>
  );
  const endGroup = (
    <>
      {controls.showNext && (
        <NavLink
          page={currentPage + 1}
          hrefForPage={hrefForPage}
          label="Next"
          ariaLabel={labels.next}
          isDisabled={controls.nextDisabled}
        />
      )}
      {controls.showLast && (
        <NavLink
          page={totalPages}
          hrefForPage={hrefForPage}
          label="Last"
          ariaLabel={labels.last}
          isDisabled={controls.lastDisabled}
        />
      )}
    </>
  );

  if (layout === "justified") {
    return (
      <nav
        aria-label={navAriaLabel}
        className="mt-12 flex w-full flex-wrap items-center justify-between gap-2"
      >
        <div className="flex flex-wrap items-center gap-2">{startGroup}</div>
        <div className="flex flex-wrap items-center justify-center gap-2">
          {numbersGroup}
        </div>
        <div className="flex flex-wrap items-center gap-2">{endGroup}</div>
      </nav>
    );
  }

  return (
    <nav
      aria-label={navAriaLabel}
      className="mt-12 flex flex-wrap items-center justify-center gap-2"
    >
      {startGroup}
      {numbersGroup}
      {endGroup}
    </nav>
  );
}
