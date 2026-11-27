"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import type { Promotion } from "@/data/promotions";
import type { EnquiryAttribution } from "@/lib/enquiry/enquiry";
import { useConversionCta } from "@/lib/conversion/use-conversion-cta";
import { cn } from "@/lib/utils";

/**
 * ConversionBar — floating quick-action bar.
 *
 * Two variants:
 * - `conversion` (default): shows the page's conversion CTA after scrolling. For demand
 *   and discovery pages (homepage, services, promotions, contact, FAQ,
 *   articles, locations).
 * - `journey`: a "Page Journey" progress indicator (how far down the page
 *   the visitor is) with a back-to-top action instead of an enquiry CTA.
 *   For informational/company/legal pages (about, pricing index, process,
 *   resources, partners, success stories, privacy, terms).
 *
 * CTA copy comes from `data/services.ts` (`Service.conversionBar`);
 * destinations target the effective service's conversion component
 * (questionnaire, audit or quote form) via the shared `useConversionCta`
 * hook — the same hook the header and footer CTAs use, so all three
 * surfaces resolve identically on every page.
 */
type ConversionBarProps = {
  /**
   * Bar variant. Defaults to `conversion`.
   */
  variant?: "conversion" | "journey";
  /**
   * Page service context (service pages pass their slug — always wins).
   * Omitted on the homepage and generic pages.
   */
  serviceSlug?: string;
  /**
   * Fallback service identity for pages without a service context.
   * Defaults to Web Development (the site-wide default).
   */
  defaultServiceSlug?: string;
  /** UTM attribution forwarded into enquiry destinations. */
  attribution?: EnquiryAttribution;
  /**
   * Authoritative featured promotion from `getFeaturedPromotion()`,
   * passed explicitly by the homepage and the promotions routes only.
   * `undefined`/`null` means no promotion applies here.
   */
  featuredPromotion?: Promotion | null;
};

export default function ConversionBar({
  variant = "conversion",
  serviceSlug,
  defaultServiceSlug,
  attribution,
  featuredPromotion,
}: Readonly<ConversionBarProps>) {
  const [ready, setReady] = useState(0);
  const [visible, setVisible] = useState(false);
  const isJourney = variant === "journey";

  useEffect(() => {
    const onScroll = () => {
      if (isJourney) {
        const max = document.body.scrollHeight - window.innerHeight;
        const pct = max > 0 ? Math.min(1, window.scrollY / max) : 0;
        setReady(Math.round(pct * 100));
      }
      setVisible(window.scrollY > 600);
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener("scroll", onScroll);
  }, [isJourney]);

  // CTA resolution is shared with the header and footer CTAs via
  // useConversionCta — identical inputs on a page resolve to the
  // identical destination.
  const cta = useConversionCta({
    serviceSlug,
    defaultServiceSlug,
    attribution,
    featuredPromotion,
  });
  const action = cta.effectiveServiceSlug === "seo"
    ? "Get a Free Audit"
    : cta.label.replace(/\s*→\s*$/, "");
  const ctaQuestion = `${action}?`;

  return (
    <section
      className={cn(
        "fixed inset-x-0 bottom-0 z-40 transition-transform duration-300",
        visible ? "translate-y-0" : "translate-y-full",
        !isJourney && "pointer-events-none",
      )}
      aria-label={isJourney ? "Page journey" : "Quick enquiry"}
      inert={!visible}
    >
      <div className={cn(
        "mx-auto max-w-[1600px] px-3 pb-3 sm:px-4 sm:pb-4",
        !isJourney && "flex justify-end",
      )}>
        <div className={cn(
          "flex items-center gap-3 border border-ink/15 bg-bone/90 px-3 py-3 backdrop-blur-md sm:px-6",
          isJourney ? "justify-between" : "pointer-events-auto max-w-full shadow-lg",
        )}>
          {isJourney ? (
            <div className="flex min-w-0 flex-1 items-center gap-3">
              <span className="small-caps shrink-0 truncate text-muted-foreground max-[380px]:hidden">
                Page Journey
              </span>
              <span className="small-caps shrink-0 text-muted-foreground min-[381px]:hidden">
                Journey
              </span>
              <div
                className="hidden h-2 w-32 bg-ink/10 sm:block"
                aria-hidden="true"
              >
                <div
                  className="h-full bg-catalyst transition-all duration-300"
                  style={{ width: `${ready}%` }}
                />
              </div>
              <span className="font-display shrink-0 text-sm font-black text-ink">
                {ready}%
              </span>
            </div>
          ) : (
            <span aria-hidden="true" className="shrink-0 font-display text-base font-bold text-ink sm:text-lg">
              Ready to
            </span>
          )}
          {isJourney ? (
            <a
              href="#top"
              className="small-caps shrink-0 whitespace-nowrap bg-catalyst px-4 py-2 text-white transition-colors hover:bg-ink sm:px-5 dark:hover:text-black"
              aria-label="Back to top of page"
            >
              Top ↑
            </a>
          ) : (
            <Link
              href={cta.href}
              data-enquiry-service={cta.effectiveServiceSlug}
              className="inline-flex min-h-11 items-center gap-2 bg-catalyst px-3 py-2 text-left text-sm font-bold text-white transition-colors hover:bg-ink sm:px-5 dark:hover:text-black"
              aria-label={`Ready to ${ctaQuestion}`}
            >
              {ctaQuestion} <span aria-hidden="true">→</span>
            </Link>
          )}
        </div>
      </div>
    </section>
  );
}

export type { ConversionBarProps };
