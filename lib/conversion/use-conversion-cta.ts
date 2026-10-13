"use client";

import { usePathname } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import type { Promotion } from "@/data/promotions";
import {
  parseEnquiryAttribution,
  type EnquiryAttribution,
} from "@/lib/enquiry/enquiry";
import {
  resolveConversion,
  type ConversionCta,
} from "@/lib/conversion/conversion";

export interface ConversionCtaInput {
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
}

/**
 * Shared CTA resolution for the header CTA, the Conversion Bar and the
 * footer CTA.
 *
 * All three surfaces call this hook with identical inputs on each page,
 * so they resolve to the same destination, service and attribution
 * values via `resolveConversion()` — the single authoritative selection
 * + destination builder. URL attribution is merged post-hydration
 * (explicit props win) so the server render stays deterministic.
 */
export function useConversionCta(input: ConversionCtaInput): ConversionCta {
  const pathname = usePathname();
  const [urlAttribution, setUrlAttribution] = useState<EnquiryAttribution>({});

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
      // URL parsing must never break the CTA.
    }
  }, []);

  const mergedAttribution = useMemo<EnquiryAttribution>(
    () => ({ ...urlAttribution, ...input.attribution }),
    [urlAttribution, input.attribution],
  );

  return useMemo(
    () =>
      resolveConversion({
        serviceSlug: input.serviceSlug,
        defaultServiceSlug: input.defaultServiceSlug,
        featuredPromotion: input.featuredPromotion ?? undefined,
        attribution:
          Object.keys(mergedAttribution).length > 0
            ? mergedAttribution
            : undefined,
        pathname,
      }),
    [
      input.serviceSlug,
      input.defaultServiceSlug,
      input.featuredPromotion,
      mergedAttribution,
      pathname,
    ],
  );
}
