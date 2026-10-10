import type { Metadata } from "next";
import Link from "next/link";
import { MapPin } from "lucide-react";
import BlueprintGrid, { SectionLabel } from "@/components/mogen/blueprint-grid";
import MagneticButton from "@/components/mogen/magnet-button";
import PageShell from "@/components/mogen/page-shell";
import { getLocationDetail, LOCATIONS, LOCATION_SLUGS } from "@/data/locations";
import { pageMetadata } from "@/lib/seo";

export const metadata: Metadata = pageMetadata({
  path: "/locations",
  title: "Locations",
  description:
    "Mogen's service areas — Maboloka (primary operating location) and Soshanguve (satellite office), serving Brits, Pretoria, Gauteng and beyond.",
});

// Directory content changes rarely; hourly regeneration keeps the sitemap,
// detail backlinks and this listing consistent without a redeploy.
export const revalidate = 3600;

export default function LocationsIndex() {
  // Physical/operational locations with real detail pages.
  const detailLocations = LOCATION_SLUGS.map((slug) => getLocationDetail(slug)!).filter(
    Boolean,
  );
  // Broader areas served (contact-led, no detail pages — never invented URLs).
  const servedAreas = LOCATIONS.toSorted((a, b) => a.order - b.order).filter(
    (loc) => !LOCATION_SLUGS.includes(loc.slug),
  );

  return (
    <PageShell
      index="// 01 — Locations"
      label="Where We Work"
      title={
        <>
          Service areas<span className="text-catalyst">.</span>
        </>
      }
      intro="Mogen is associated with Maboloka and supports businesses across the surrounding communities, greater Gauteng and beyond where remote delivery fits."
    >
      <BlueprintGrid className="bg-secondary py-24 lg:py-32">
        <div className="mx-auto max-w-[1600px] px-6 lg:px-10">
          <SectionLabel index="// 02 — Offices" title="Our locations" />
          <div className="grid grid-cols-1 gap-px bg-ink/10 md:grid-cols-2">
            {detailLocations.map((loc) => (
              <article key={loc.slug} className="flex flex-col bg-bone p-8 lg:p-12">
                <MapPin className="h-6 w-6 text-catalyst" aria-hidden="true" />
                <span className="small-caps mt-4 text-ink/50">{loc.role}</span>
                <h2 className="mt-2 font-display text-3xl font-black text-ink">
                  {loc.name}
                </h2>
                <p className="mt-1 text-sm text-ink/50">{loc.area}</p>
                <p className="mt-4 flex-1 text-sm leading-relaxed text-ink/70">
                  {loc.intro}
                </p>
                <div className="mt-6 flex flex-wrap gap-1.5">
                  {loc.services.map((s) => (
                    <span
                      key={s.href}
                      className="small-caps border border-ink/10 px-2 py-1 text-ink/60"
                    >
                      {s.name}
                    </span>
                  ))}
                </div>
                <Link
                  href={`/locations/${loc.slug}`}
                  className="small-caps mt-6 inline-flex text-ink hover:text-catalyst"
                >
                  View location →
                </Link>
              </article>
            ))}
          </div>
        </div>
      </BlueprintGrid>

      {servedAreas.length > 0 && (
        <BlueprintGrid className="bg-bone py-24 lg:py-32">
          <div className="mx-auto max-w-[1600px] px-6 lg:px-10">
            <SectionLabel index="// 03 — Served" title="Also serving" />
            <div className="grid grid-cols-1 gap-px bg-ink/10 sm:grid-cols-2 lg:grid-cols-4">
              {servedAreas.map((loc) => (
                <article key={loc.slug} className="flex flex-col bg-bone p-8">
                  <MapPin className="h-6 w-6 text-catalyst" aria-hidden="true" />
                  <h3 className="mt-4 font-display text-xl font-black text-ink">
                    {loc.name}
                  </h3>
                  <span className="small-caps mt-1 text-ink/50">{loc.region}</span>
                  <p className="mt-3 flex-1 text-sm leading-relaxed text-ink/70">
                    {loc.description}
                  </p>
                  <Link
                    href={loc.href}
                    className="small-caps mt-6 inline-flex text-ink hover:text-catalyst"
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
      )}
    </PageShell>
  );
}
