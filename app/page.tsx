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
import { getActivePromotion } from "@/data/promotions";
import { siteConfig } from "@/data/site";

export default function Home() {
  const promotion = getActivePromotion();
  // The promotion slot sits at 05. When no promotion is active the section is
  // not rendered, so every section after it shifts up one to stay consecutive.
  const afterPromotion = promotion ? 6 : 5;

  return (
    <div className="bg-bone">
      <link rel="canonical" href={`${siteConfig.url}/`} />
      <meta property="og:url" content={`${siteConfig.url}/`} />
      <JsonLd />
      <Nav />
      <main>
        <Hero />
        <WhatMogenDoes numbering={1} />
        <Services numbering={2} auditHref="#audit" />
        <WhyMogen numbering={3} />
        <GrowthAudit numbering={4} />
        {promotion && <Promotion numbering={5} />}
        <Portfolio numbering={afterPromotion} />
        <ArticlesPreview numbering={afterPromotion + 1} />
        <LocationsPreview numbering={afterPromotion + 2} />
        <FinalCTA numbering={afterPromotion + 3} />
      </main>
      <Footer />
      <ConversionBar auditHref="#audit" />
    </div>
  );
}
