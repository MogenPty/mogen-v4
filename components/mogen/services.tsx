"use client";

import { Code2, FileText, Megaphone, Search } from "lucide-react";
import { useEqualHeight } from "@/hooks/use-equal-height";
import { getBlankCount } from "@/lib/grid-utils";
import BlueprintGrid, { SectionLabel } from "./blueprint-grid";
import MagneticButton from "./magnet-button";
import ServiceCard from "./service-card";

const SERVICES = [
  {
    icon: Code2,
    name: "Web Development",
    slug: "web-development",
    desc: "Custom websites that work perfectly on all devices. Fast, secure, and built to convert visitors into customers.",
    deliverables: ["Responsive build", "Core Web Vitals", "Conversion UX"],
    featured: true,
  },
  {
    icon: FileText,
    name: "Business Documentation",
    slug: "business-documentation",
    desc: "Professional business documents — policies, procedures, forms and templates structured for clarity and consistency.",
    deliverables: [
      "Policies & procedures",
      "Forms & templates",
      "Professional formatting",
    ],
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
  },
];

export default function Services() {
  const ServiceList = SERVICES.slice(1);
  const blankCount = getBlankCount(ServiceList.length);
  const gridRef = useEqualHeight<HTMLDivElement>([ServiceList.length], {
    cssVar: "--grid-cell-height",
    selector: ".item, .blank, .cta",
  });

  return (
    <BlueprintGrid id={"services"} className="bg-bone py-24 lg:py-32">
      <div className="mx-auto max-w-[1600px] px-6 lg:px-10">
        <SectionLabel index="// 02 — Services" title="Current Services" />

        <div className="mb-14 flex flex-col justify-between gap-6 lg:flex-row lg:items-end">
          <h2 className="font-display text-4xl font-black leading-[1.05] text-ink lg:text-6xl text-balance">
            Four services,
            <br />
            <span className="text-catalyst">clearly scoped.</span>
          </h2>
          <p className="max-w-md text-lg text-ink/70">
            Websites, online visibility, marketing and documentation — each a
            distinct service so you know what you are paying for. No bundled
            jargon or hidden extras.
          </p>
        </div>

        <div
          ref={gridRef}
          id={"serviceGrid"}
          className="grid grid-cols-1 gap-px bg-ink/10 md:grid-cols-2 lg:grid-cols-3"
        >
          {ServiceList.map((s) => (
            <ServiceCard
              key={s.name}
              name={s.name}
              slug={s.slug}
              desc={s.desc}
              deliverables={s.deliverables}
              icon={s.icon}
              featured={s.featured}
              className="item"
            />
          ))}

          {Array.from({ length: blankCount }).map((_, i) => (
            <article
              // biome-ignore lint/suspicious/noArrayIndexKey: Items are only identified as indexed.
              key={`blank-${i}`}
              className="flex flex-col justify-center invisible blank"
              aria-hidden="true"
            />
          ))}

          {/* CTA tile */}
          <article className="flex flex-col justify-between bg-ink p-8 text-bone cta">
            <h3 className="font-display text-2xl font-black">
              Not sure where to start?
            </h3>
            <p className="mt-3 text-sm text-bone/70">
              Start with a free Growth Audit — a practical review of your
              current visibility and a clear next step.
            </p>
            <MagneticButton
              as="a"
              href="#audit"
              variant="catalyst"
              className="mt-8"
            >
              Get Free Audit
            </MagneticButton>
          </article>
        </div>
      </div>
    </BlueprintGrid>
  );
}
