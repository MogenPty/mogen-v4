import { MapPin } from "lucide-react";
import Link from "next/link";
import { LOCATIONS } from "@/data/locations";
import BlueprintGrid, { SectionLabel } from "./blueprint-grid";
import MagneticButton from "./magnet-button";

export default function LocationsPreview() {
  return (
    <BlueprintGrid id="locations" className="bg-secondary py-24 lg:py-32">
      <div className="mx-auto max-w-[1600px] px-6 lg:px-10">
        <SectionLabel index="// 08 — Locations" title="Where We Work" />
        <div className="mb-14 flex flex-col justify-between gap-6 lg:flex-row lg:items-end">
          <h2 className="font-display text-4xl font-black leading-[1.05] text-ink lg:text-6xl text-balance">
            Rooted in Maboloka,
            <br />
            <span className="text-catalyst">serving South Africa.</span>
          </h2>
          <p className="max-w-md text-lg text-ink/70">
            Mogen is associated with Maboloka and works with businesses across
            Pretoria, Soshanguve, greater Gauteng and beyond where remote
            delivery fits the scope.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-px bg-ink/10 md:grid-cols-2 lg:grid-cols-4">
          {LOCATIONS.map((loc) => (
            <article key={loc.slug} className="flex flex-col bg-bone p-8">
              <MapPin className="h-6 w-6 text-catalyst" aria-hidden="true" />
              <h3 className="mt-4 font-display text-xl font-black text-ink">{loc.name}</h3>
              <span className="small-caps mt-1 text-ink/50">{loc.region}</span>
              <p className="mt-3 flex-1 text-sm leading-relaxed text-ink/70">{loc.description}</p>
              <div className="mt-4 flex flex-wrap gap-1.5">
                {loc.services.slice(0, 2).map((s) => (
                  <span key={s} className="small-caps border border-ink/10 px-2 py-1 text-ink/60">
                    {s}
                  </span>
                ))}
              </div>
              <Link
                href={loc.href}
                className="mt-6 inline-flex small-caps text-ink hover:text-catalyst"
              >
                Get in touch →
              </Link>
            </article>
          ))}
        </div>

        <div className="mt-12">
          <MagneticButton as="a" href="/contact" variant="outline">
            Talk about your area →
          </MagneticButton>
        </div>
      </div>
    </BlueprintGrid>
  );
}
