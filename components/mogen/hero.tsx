"use client";

import { getService } from "@/data/services";
import type { Promotion } from "@/data/promotions";
import type { EnquiryAttribution } from "@/lib/enquiry/enquiry";
import { useConversionCta } from "@/lib/conversion/use-conversion-cta";
import { DEFAULT_HERO_SERVICE_SLUG, heroMicrocopy } from "@/lib/hero";
import DriftingMetrics from "./drifting-metrics";
import MagneticButton from "./magnet-button";

interface HeroProps {
  /**
   * Effective service for this render (resolved server-side from the
   * featured promotion via `resolveHeroServiceSlug()`). Defaults to Web
   * Development — the site-wide default.
   */
  serviceSlug?: string;
  /** UTM attribution forwarded into enquiry destinations. */
  attribution?: EnquiryAttribution;
  /**
   * Authoritative featured promotion. Passed through to the shared
   * conversion hook so the hero CTA always matches the header, bar and
   * footer on the same page.
   */
  featuredPromotion?: Promotion | null;
}

export default function Hero({
  serviceSlug = DEFAULT_HERO_SERVICE_SLUG,
  attribution,
  featuredPromotion,
}: Readonly<HeroProps>) {
  const service = getService(serviceSlug) ?? getService(DEFAULT_HERO_SERVICE_SLUG)!;
  // Primary CTA resolves identically to the ConversionBar on this page.
  const cta = useConversionCta({
    defaultServiceSlug: service.slug,
    attribution,
    featuredPromotion,
  });

  return (
    <section
      id={"top"}
      className="relative min-h-screen w-full overflow-hidden bg-bone pt-24"
    >
      {/* parallax drifting metric numbers */}
      <DriftingMetrics />

      <div className="relative z-10 mx-auto flex min-h-[calc(100vh-6rem)] max-w-[1600px] flex-col justify-center px-6 py-12 lg:px-12 lg:py-20">
        <div className="mx-auto w-full max-w-4xl">
          <div className="mb-6 flex min-w-0 flex-wrap items-center gap-3">
            <span
              className="h-2 w-2 bg-catalyst animate-pulse"
              aria-hidden="true"
            />
            <span className="small-caps text-muted-foreground">
              Maboloka · Soshanguve · Centurion
            </span>
          </div>

          <h1 className="font-display text-[11vw] leading-[0.95] font-black tracking-tight text-ink lg:text-[5vw]">
            Professional {service.name}
            <br />
            <span className="text-catalyst">for South African Businesses.</span>
          </h1>

          <p className="mt-8 max-w-xl text-lg leading-relaxed text-ink/80">
            {service.tagline} Serving Maboloka, Soshanguve, Centurion and businesses across South Africa.
          </p>

          <div className="mt-10 flex flex-wrap items-center gap-4">
            <MagneticButton
              as="a"
              href={cta.href}
              variant="catalyst"
              aria-label={cta.ariaLabel}
            >
              {cta.label}
            </MagneticButton>
            <MagneticButton
              as="a"
              href="#services"
              variant="outline"
              aria-label="Explore Mogen services"
            >
              Explore Services
            </MagneticButton>
            <p className="text-ink/70 italic">
              {heroMicrocopy(service.slug)}
            </p>
          </div>
        </div>
      </div>

      <div className="relative z-10 flex justify-center pb-10">
        <a
          href="#services"
          className="small-caps text-muted-foreground hover:text-catalyst transition-colors"
          aria-label="Scroll to services"
        >
          Scroll to deconstruct ↓
        </a>
      </div>
    </section>
  );
}
