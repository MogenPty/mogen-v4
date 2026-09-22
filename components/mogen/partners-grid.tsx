"use client";

import { ArrowUpRight } from "lucide-react";
import BlueprintGrid from "./blueprint-grid";

const PARTNERS = [
  {
    name: "Google Analytics",
    category: "Analytics",
    desc: "Traffic and conversion intelligence that drives every decision.",
    href: "https://analytics.google.com",
  },
  {
    name: "Google Search Console",
    category: "SEO",
    desc: "Indexation, search performance and technical health monitoring.",
    href: "https://search.google.com/search-console",
  },
  {
    name: "Google Business Profile",
    category: "Local SEO",
    desc: "The free local lead engine we optimise for every client.",
    href: "https://www.google.com/business",
  },
  {
    name: "Shopify",
    category: "E-commerce",
    desc: "Fast, reliable online stores we build and optimise for growth.",
    href: "https://www.shopify.com",
  },
  {
    name: "WordPress",
    category: "CMS",
    desc: "Flexible content management for content-led SEO builds.",
    href: "https://wordpress.org",
  },
  {
    name: "Stripe",
    category: "Payments",
    desc: "Secure, conversion-friendly payments for online businesses.",
    href: "https://stripe.com",
  },
  {
    name: "Meta Business",
    category: "Social",
    desc: "Audience targeting and social campaigns that complement SEO.",
    href: "https://business.facebook.com",
  },
  {
    name: "Hotjar",
    category: "Conversion",
    desc: "Heatmaps and session recordings that reveal what visitors do.",
    href: "https://www.hotjar.com",
  },
];

export default function PartnersGrid() {
  return (
    <BlueprintGrid className="bg-bone pb-24">
      <div className="mx-auto max-w-[1600px] px-6 lg:px-10">
        <div className="grid grid-cols-1 gap-px bg-ink/10 md:grid-cols-2 lg:grid-cols-4">
          {PARTNERS.map((p) => (
            <a
              key={p.name}
              href={p.href}
              target="_blank"
              rel="noopener noreferrer"
              className="group flex flex-col bg-bone p-6 transition-colors hover:bg-ink hover:text-bone"
            >
              <div className="flex items-center justify-between">
                <span className="small-caps text-catalyst">{p.category}</span>
                <ArrowUpRight
                  className="h-4 w-4 opacity-50 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5"
                  aria-hidden="true"
                />
              </div>
              <h3 className="mt-6 font-display text-xl font-black">{p.name}</h3>
              <p className="mt-2 flex-1 text-sm opacity-80">{p.desc}</p>
            </a>
          ))}
        </div>
      </div>
    </BlueprintGrid>
  );
}
