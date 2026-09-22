"use client";

import { Code2, Megaphone, Palette, Search, Smartphone } from "lucide-react";
import Link from "next/link";
import BlueprintGrid, { SectionLabel } from "./blueprint-grid";
import MagneticButton from "./magnet-button";

const SERVICES = [
  {
    icon: Code2,
    name: "Web Development",
    slug: "web-development",
    desc: "Custom websites that work perfectly on all devices. Fast, secure, and built to convert visitors into customers.",
    deliverables: ["Responsive build", "Core Web Vitals", "Conversion UX"],
  },
  {
    icon: Smartphone,
    name: "Mobile Development",
    slug: "mobile-development",
    desc: "Custom mobile apps that feel native on any device — fast, secure and built to engage.",
    deliverables: ["iOS & Android", "Native feel", "App store ready"],
  },
  {
    icon: Palette,
    name: "Brand Identity",
    slug: "brand-identity",
    desc: "Logos, colours and visual systems that make your business unforgettable. Stand out from the competition.",
    deliverables: ["Logo & marks", "Colour system", "Brand guidelines"],
  },
  {
    icon: Megaphone,
    name: "Digital Marketing",
    slug: "digital-marketing",
    desc: "Get found online with social media and content that actually brings in new customers.",
    deliverables: ["Content strategy", "Social campaigns", "Lead nurture"],
  },
  {
    icon: Search,
    name: "SEO Services",
    slug: "seo-services",
    desc: "Local SEO that gets you found on Google — Google Business Profile, on-page optimisation and content that brings real enquiries from nearby customers.",
    deliverables: ["Local SEO", "GBP optimisation", "On-page SEO"],
    featured: true,
  },
];

export default function Services() {
  return (
    <BlueprintGrid id="services" className="bg-bone py-24 lg:py-32">
      <div className="mx-auto max-w-[1600px] px-6 lg:px-10">
        <SectionLabel index="// 01 — Capabilities" title="What We Do" />

        <div className="mb-14 flex flex-col justify-between gap-6 lg:flex-row lg:items-end">
          <h2 className="font-display text-4xl font-black leading-[1.05] text-ink lg:text-6xl text-balance">
            Services that
            <br />
            <span className="text-catalyst">get results.</span>
          </h2>
          <p className="max-w-md text-lg text-ink/70">
            We don't just build websites. We create digital experiences that
            drive business growth — engineered on a technical grid, optimised
            for Google.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-px bg-ink/10 md:grid-cols-2 lg:grid-cols-3">
          {SERVICES.map((s) => {
            const Icon = s.icon;
            return (
              <article
                key={s.name}
                className="group relative bg-bone p-8 transition-colors hover:bg-ink hover:text-bone"
              >
                {s.featured && (
                  <span className="absolute right-6 top-6 small-caps text-catalyst">
                    Core
                  </span>
                )}
                <Icon
                  className="h-8 w-8 text-catalyst"
                  strokeWidth={1.5}
                  aria-hidden="true"
                />
                <h3 className="mt-6 font-display text-2xl font-black">
                  {s.name}
                </h3>
                <p className="mt-3 text-sm leading-relaxed opacity-80">
                  {s.desc}
                </p>
                <ul className="mt-6 space-y-2">
                  {s.deliverables.map((d) => (
                    <li key={d} className="flex items-center gap-2 text-sm">
                      <span
                        className="h-1 w-1 bg-catalyst"
                        aria-hidden="true"
                      />
                      {d}
                    </li>
                  ))}
                </ul>
                <Link
                  href={`/services/${s.slug}`}
                  className="mt-8 inline-flex items-center gap-2 text-sm small-caps text-current group-hover:text-catalyst"
                >
                  Learn more →
                </Link>
              </article>
            );
          })}

          {/* CTA tile */}
          <article className="flex flex-col justify-between bg-ink p-8 text-bone">
            <h3 className="font-display text-2xl font-black">
              Need the full stack?
            </h3>
            <p className="mt-3 text-sm text-bone/70">
              Bundle web, brand and SEO into one growth package — engineered to
              compound.
            </p>
            <MagneticButton
              as="a"
              href="#pricing"
              variant="catalyst"
              className="mt-8"
            >
              View Packages
            </MagneticButton>
          </article>
        </div>
      </div>
    </BlueprintGrid>
  );
}
