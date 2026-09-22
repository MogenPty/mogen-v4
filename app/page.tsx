import React from "react";
import ConversionBar from "@/components/mogen/conversation-bar";
import CallToAction from "@/components/mogen/cta";
import Footer from "@/components/mogen/footer";
import GrowthAudit from "@/components/mogen/growth-audit";
import Hero from "@/components/mogen/hero";
import Nav from "@/components/mogen/nav";
import Portfolio from "@/components/mogen/portfolio";
import Pricing from "@/components/mogen/pricing";
import Services from "@/components/mogen/services";
import Testimonials from "@/components/mogen/testimonials";

export default function Home() {
  return (
    <div className="bg-bone">
      <Nav />
      <main>
        <Hero />
        <Services />
        <GrowthAudit />
        <Portfolio />
        <Testimonials />
        <Pricing />
        <CallToAction />
      </main>
      <Footer />
      <ConversionBar />
    </div>
  );
}
