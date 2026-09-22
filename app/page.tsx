import React from "react";
import ArticlesPreview from "@/components/mogen/articles-preview";
import ConversionBar from "@/components/mogen/conversation-bar";
import FinalCTA from "@/components/mogen/final-cta";
import Footer from "@/components/mogen/footer";
import GrowthAudit from "@/components/mogen/growth-audit";
import Hero from "@/components/mogen/hero";
import LocationsPreview from "@/components/mogen/locations-preview";
import Nav from "@/components/mogen/nav";
import Portfolio from "@/components/mogen/portfolio";
import Promotion from "@/components/mogen/promotion";
import Services from "@/components/mogen/services";
import WhatMogenDoes from "@/components/mogen/what-mogen-does";
import WhyMogen from "@/components/mogen/why-mogen";

export default function Home() {
  return (
    <div className="bg-bone">
      <Nav />
      <main>
        <Hero />
        <WhatMogenDoes />
        <Services />
        <WhyMogen />
        <GrowthAudit />
        <Promotion />
        <Portfolio />
        <ArticlesPreview />
        <LocationsPreview />
        <FinalCTA />
      </main>
      <Footer />
      <ConversionBar />
    </div>
  );
}
