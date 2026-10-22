import type { Metadata } from "next";
import React from "react";
import ArticlesPreview from "@/components/mogen/articles-preview";
import ConversionBar from "@/components/mogen/conversation-bar";
import FinalCTA from "@/components/mogen/final-cta";
import Footer from "@/components/mogen/footer";
import Hero from "@/components/mogen/hero";
import JsonLd from "@/components/mogen/json-ld";
import LocationsPreview from "@/components/mogen/locations-preview";
import Portfolio from "@/components/mogen/portfolio";
import Nav from "@/components/mogen/nav";
import Promotion from "@/components/mogen/promotion";
import Services from "@/components/mogen/services";
import WebsiteQuestionnaire from "@/components/mogen/website-questionnaire";
import WhatMogenDoes from "@/components/mogen/what-mogen-does";
import WhyMogen from "@/components/mogen/why-mogen";
import { getActivePromotions, getFeaturedPromotion } from "@/data/promotions";
import { parseEnquiryAttribution } from "@/lib/enquiry/enquiry";
import { resolveHeroServiceSlug } from "@/lib/hero";
import { pageMetadata } from "@/lib/seo";
import { STATIC_META } from "@/lib/seo/metadata-registry";

// Homepage metadata via the Next.js API (Task 8): canonical + OG/Twitter
// derive from the configured site URL. Title is absolute so the layout
// template does not append a second `| Mogen`. Phase 3 positions the
// homepage around Web Development. Copy lives in the metadata registry
// (lib/seo/metadata-registry.ts) so regression tests assert served values.
const homeSeo = pageMetadata({
  path: "/",
  title: STATIC_META["/"].title,
  description: STATIC_META["/"].description,
});
export const metadata: Metadata = {
  ...homeSeo,
  title: {
    absolute: STATIC_META["/"].title,
  },
};

// Promotion date transitions and the fallback-featuring env flag take
// effect without a redeploy: the homepage regenerates at most hourly.
export const revalidate = 3600;

export default async function Home({
  searchParams,
}: Readonly<{
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}>) {
  const promotion = getFeaturedPromotion();
  // Active promotions for the questionnaire: when one targets the
  // recommended package, its price points replace the standard display.
  const activePromotions = getActivePromotions();
  // Carry allowlisted attribution (utm_*) from the homepage URL into
  // the featured promotion's enquiry CTA.
  const attribution = parseEnquiryAttribution((await searchParams) ?? {});
  // The hero follows the featured promotion's service (Web Development
  // by default) — headline, sub-copy and primary CTA stay in sync with
  // the offer below and the header/bar/footer CTAs.
  const heroServiceSlug = resolveHeroServiceSlug(promotion);
  let numbering = 1;

  return (
    <div className="bg-bone">
      <JsonLd />
      <Nav
        defaultServiceSlug="web-development"
        attribution={attribution}
        featuredPromotion={promotion}
      />
      <main>
        <Hero
          serviceSlug={heroServiceSlug}
          attribution={attribution}
          featuredPromotion={promotion}
        />
        <WhatMogenDoes numbering={numbering++} />
        <Services
          numbering={numbering++}
          auditHref="#assessment"
          ctaTitle="Not sure which website fits?"
          ctaBody="Answer five quick questions about your business and website needs — get a clear Seed, Sprout or Vegetative recommendation."
          ctaLabel="Find Your Package"
        />
        <WhyMogen numbering={numbering++} />
        <WebsiteQuestionnaire
          numbering={numbering++}
          initialAttribution={attribution}
          promotions={activePromotions}
        />
        {promotion && (
          <Promotion
            numbering={numbering++}
            attribution={attribution}
            promotion={promotion}
          />
        )}
        <Portfolio numbering={numbering++} />
        <ArticlesPreview numbering={numbering++} />
        <LocationsPreview numbering={numbering++} />
        <FinalCTA numbering={numbering++} auditHref="/services/seo#audit" />
      </main>
      <Footer
        defaultServiceSlug="web-development"
        attribution={attribution}
        featuredPromotion={promotion}
      />
      <ConversionBar
        defaultServiceSlug="web-development"
        attribution={attribution}
        featuredPromotion={promotion}
      />
    </div>
  );
}
