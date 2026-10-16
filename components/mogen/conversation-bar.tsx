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
 * - `conversion` (default): tracks the visitor's "Conversion Readiness"
 *   as they scroll, with the page's conversion CTA beside it. For demand
 *   and discovery pages (homepage, services, promotions, contact, FAQ,
 *   articles, locations).
 * - `journey`: a "Page Journey" progress indicator (how far down the page
 *   the visitor is) with a back-to-top action instead of an enquiry CTA.
 *   For informational/company/legal pages (about, pricing index, process,
 *   resources, partners, success stories, privacy, terms).
 *
 * The "Conversion Readiness" label is UI chrome with no SEO value; the
 * variant choice is a conversion/UX decision, not an SEO one.
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

  useEffect(() => {
    const onScroll = () => {
      const max = document.body.scrollHeight - window.innerHeight;
      const pct = max > 0 ? Math.min(1, window.scrollY / max) : 0;
      setReady(Math.round(pct * 100));
      setVisible(window.scrollY > 600);
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // CTA resolution is shared with the header and footer CTAs via
  // useConversionCta — identical inputs on a page resolve to the
  // identical destination.
  const cta = useConversionCta({
    serviceSlug,
    defaultServiceSlug,
    attribution,
    featuredPromotion,
  });

  return (
    <section
      className={cn(
        "fixed inset-x-0 bottom-0 z-40 transition-transform duration-300",
        visible ? "translate-y-0" : "translate-y-full",
      )}
      aria-label={variant === "journey" ? "Page journey" : "Conversion readiness"}
    >
      <div className="mx-auto max-w-[1600px] px-3 pb-3 sm:px-4 sm:pb-4">
        <div className="flex items-center justify-between gap-3 border border-ink/15 bg-bone/90 px-3 py-3 backdrop-blur-md sm:px-6">
          <div className="flex min-w-0 flex-1 items-center gap-3">
            <span className="small-caps shrink-0 truncate text-muted-foreground max-[380px]:hidden">
              {variant === "journey" ? "Page Journey" : "Conversion Readiness"}
            </span>
            <span className="small-caps shrink-0 text-muted-foreground min-[381px]:hidden">
              {variant === "journey" ? "Journey" : "Ready"}
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
          {variant === "journey" ? (
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
              className="small-caps shrink-0 whitespace-nowrap bg-catalyst px-4 py-2 text-white transition-colors hover:bg-ink sm:px-5 dark:hover:text-black"
              aria-label={cta.ariaLabel}
            >
              {cta.label}
            </Link>
          )}
        </div>
      </div>
    </section>
  );
}

export type { ConversionBarProps };
