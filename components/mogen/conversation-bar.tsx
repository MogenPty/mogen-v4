"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import type { Promotion } from "@/data/promotions";
import {
  parseEnquiryAttribution,
  type EnquiryAttribution,
} from "@/lib/enquiry/enquiry";
import { resolveConversion } from "@/lib/conversion/conversion";
import { cn } from "@/lib/utils";

/**
 * ConversionBar — floating quick-action bar that tracks the visitor's
 * "Conversion Readiness" as they scroll deeper into the funnel.
 *
 * CTA copy and destination bases come from `data/services.ts`
 * (`Service.conversionBar` — no `auditHref` prop). Service pages always
 * use their own service's settings; the homepage and the promotions
 * routes (the only callers that pass a featured promotion) use the
 * promotion's service settings when valid; everywhere else the
 * site-wide default applies (Web Development).
 */
type ConversionBarProps = {
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
  /** Package context to preserve (only when it belongs to the journey's service). */
  packageSlug?: string;
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
  serviceSlug,
  defaultServiceSlug,
  packageSlug,
  attribution,
  featuredPromotion,
}: Readonly<ConversionBarProps>) {
  const [ready, setReady] = useState(0);
  const [visible, setVisible] = useState(false);
  const [urlAttribution, setUrlAttribution] = useState<EnquiryAttribution>({});
  const pathname = usePathname();

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

  // Preserve UTM attribution from the current URL without discarding the
  // explicit prop (explicit values win). Runs post-hydration so the server
  // render stays deterministic.
  useEffect(() => {
    try {
      const parsed = parseEnquiryAttribution(
        new URLSearchParams(window.location.search),
      );
      if (Object.keys(parsed).length > 0) {
        // biome-ignore lint/correctness/useExhaustiveDependencies: post-hydration URL sync only
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setUrlAttribution(parsed);
      }
    } catch {
      // URL parsing must never break the bar.
    }
  }, []);

  const mergedAttribution = useMemo<EnquiryAttribution>(
    () => ({ ...urlAttribution, ...attribution }),
    [urlAttribution, attribution],
  );

  const cta = useMemo(
    () =>
      resolveConversion({
        serviceSlug,
        defaultServiceSlug,
        featuredPromotion: featuredPromotion ?? undefined,
        attribution:
          Object.keys(mergedAttribution).length > 0
            ? mergedAttribution
            : undefined,
        packageSlug,
        pathname,
      }),
    [
      serviceSlug,
      defaultServiceSlug,
      featuredPromotion,
      mergedAttribution,
      packageSlug,
      pathname,
    ],
  );

  return (
    <section
      className={cn(
        "fixed inset-x-0 bottom-0 z-40 transition-transform duration-300",
        visible ? "translate-y-0" : "translate-y-full",
      )}
      aria-label="Conversion readiness"
    >
      <div className="mx-auto max-w-[1600px] px-3 pb-3 sm:px-4 sm:pb-4">
        <div className="flex items-center justify-between gap-3 border border-ink/15 bg-bone/90 px-3 py-3 backdrop-blur-md sm:px-6">
          <div className="flex min-w-0 flex-1 items-center gap-3">
            <span className="small-caps shrink-0 truncate text-muted-foreground max-[380px]:hidden">
              Conversion Readiness
            </span>
            <span className="small-caps shrink-0 text-muted-foreground min-[381px]:hidden">
              Ready
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
          <Link
            href={cta.href}
            className="small-caps shrink-0 whitespace-nowrap bg-catalyst px-4 py-2 text-white transition-colors hover:bg-ink sm:px-5 dark:hover:text-black"
            aria-label={cta.ariaLabel}
          >
            {cta.label}
          </Link>
        </div>
      </div>
    </section>
  );
}

export type { ConversionBarProps };
