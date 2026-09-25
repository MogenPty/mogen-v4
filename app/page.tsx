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
import { siteConfig } from "@/data/site";

export default function Home() {
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
        <Promotion numbering={5} />
        <Portfolio numbering={6} />
        <ArticlesPreview numbering={7} />
        <LocationsPreview numbering={8} />
        <FinalCTA numbering={9} />
      </main>
      <Footer />
      <ConversionBar auditHref="#audit" />
    </div>
  );
}
