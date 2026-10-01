import type { Metadata } from "next";
import React from "react";
import ArticlesPreview from "@/components/mogen/articles-preview";
import ConversionBar from "@/components/mogen/conversation-bar";
import FinalCTA from "@/components/mogen/final-cta";
import Footer from "@/components/mogen/footer";
import GrowthAudit from "@/components/mogen/growth-audit";
import Hero from "@/components/mogen/hero";
import JsonLd from "@/components/mogen/json-ld";
import LocationsPreview from "@/components/mogen/locations-preview";
import Nav from "@/components/mogen/nav";
import Portfolio from "@/components/mogen/portfolio";
import Promotion from "@/components/mogen/promotion";
import Services from "@/components/mogen/services";
import WhatMogenDoes from "@/components/mogen/what-mogen-does";
import WhyMogen from "@/components/mogen/why-mogen";
import { getFeaturedPromotion } from "@/data/promotions";
import { parseEnquiryAttribution } from "@/lib/enquiry/enquiry";
import { pageMetadata } from "@/lib/seo";

// Homepage metadata via the Next.js API (Task 8): canonical + OG/Twitter
// derive from the configured site URL. Title is absolute so the layout
// template does not append a second `| Mogen`.
const homeSeo = pageMetadata({
  path: "/",
  title: "Mogen | Digital Services for South African Businesses",
  description:
    "Mogen helps South African businesses grow with websites, SEO, digital marketing and business documentation. Based in Maboloka, serving Pretoria and Soshanguve.",
});
export const metadata: Metadata = {
  ...homeSeo,
  title: {
    absolute: "Mogen | Digital Services for South African Businesses",
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
  // Carry allowlisted attribution (utm_*) from the homepage URL into
  // the featured promotion's enquiry CTA.
  const attribution = parseEnquiryAttribution((await searchParams) ?? {});
  let numbering = 1;

  return (
    <div className="bg-bone">
      <JsonLd />
      <Nav />
      <main>
        <Hero />
        <WhatMogenDoes numbering={numbering++} />
        <Services numbering={numbering++} auditHref="#audit" />
        <WhyMogen numbering={numbering++} />
        <GrowthAudit numbering={numbering++} />
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
        <FinalCTA numbering={numbering++} />
      </main>
      <Footer />
      <ConversionBar auditHref="#audit" />
    </div>
  );
}
