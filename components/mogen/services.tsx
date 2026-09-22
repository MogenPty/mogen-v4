"use client";

import { SERVICES } from "@/data/services";
import { useEqualHeight } from "@/hooks/use-equal-height";
import { getBlankCount } from "@/lib/grid-utils";
import BlueprintGrid, { SectionLabel } from "./blueprint-grid";
import MagneticButton from "./magnet-button";
import ServiceCard from "./service-card";

// Grid display order per spec: Web Development → SEO → Digital Marketing → Business Documentation
const GRID_ORDER = [
  "web-development",
  "seo",
  "digital-marketing",
  "business-documentation",
] as const;

const GRID_SERVICES = GRID_ORDER.map((slug) => {
  const svc = SERVICES.find((s) => s.slug === slug);
  if (!svc) throw new Error(`Missing service for grid: ${slug}`);
  return svc;
}).map((svc) => ({
  icon: svc.icon,
  name: svc.name,
  slug: svc.slug,
  desc: svc.tagline,
  // Use first 3 deliverables as the grid summary — authoritative, not duplicated
  deliverables: (svc.deliverables ?? []).slice(0, 3),
  featured: svc.slug === "web-development",
}));

interface Props {
  auditHref?: string;
}

export default function Services({ auditHref = "/#audit" }: Readonly<Props>) {
  const blankCount = getBlankCount(GRID_SERVICES.length);
  const gridRef = useEqualHeight<HTMLDivElement>([GRID_SERVICES.length], {
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
          {GRID_SERVICES.map((s) => (
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
              className="hidden md:flex flex-col justify-center invisible blank"
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
              href={auditHref}
              variant="catalyst"
              className="mt-8 hover:bg-secondary hover:text-secondary-foreground"
            >
              Get Free Audit
            </MagneticButton>
          </article>
        </div>
      </div>
    </BlueprintGrid>
  );
}
