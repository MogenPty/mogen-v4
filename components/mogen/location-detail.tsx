import { ArrowRight, CalendarCheck, Mail, MapPin, Phone } from "lucide-react";
import Link from "next/link";
import BlueprintGrid, { SectionLabel } from "@/components/mogen/blueprint-grid";
import FinalCTA from "@/components/mogen/final-cta";
import MagneticButton from "@/components/mogen/magnet-button";
import PageShell from "@/components/mogen/page-shell";
import {
  getLocationDetail,
  LOCATION_SLUGS,
} from "@/data/locations";
import { siteConfig } from "@/data/site";
import { formatNumber } from "@/lib/utils";

interface Props {
  locationSlug: string;
  numbering?: number;
}

export default function LocationDetail({
  locationSlug,
  numbering = 1,
}: Readonly<Props>) {
  const location = getLocationDetail(locationSlug);

  if (!location) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-bone px-6 text-center">
        <h1 className="font-display text-4xl font-black text-ink">
          Location not found
        </h1>
        <p className="mt-4 text-ink/60">
          We couldn&apos;t find that location.
        </p>
        <MagneticButton as="a" href="/" variant="catalyst" className="mt-8">
          Back home
        </MagneticButton>
      </div>
    );
  }

  const otherSlugs = LOCATION_SLUGS.filter((s) => s !== location.slug);
  const other = otherSlugs.length > 0 ? getLocationDetail(otherSlugs[0]) : undefined;

  return (
    <PageShell
      index={`// ${formatNumber(numbering)} — Locations`}
      label={location.role}
      title={
        <>
          {location.name}
          <span className="text-catalyst">.</span>
        </>
      }
      intro={location.intro}
    >
      {/* What happens at this location */}
      <BlueprintGrid className="bg-secondary py-24 lg:py-32">
        <div className="mx-auto max-w-[1600px] px-6 lg:px-10">
          <SectionLabel
            index={`// ${formatNumber(numbering + 1)} — At This Location`}
            title={location.area}
          />
          <div className="mb-14 max-w-2xl">
            <h2 className="font-display text-4xl font-black leading-[1.05] text-ink lg:text-5xl text-balance">
              What happens
              <br />
              <span className="text-catalyst">in {location.name}.</span>
            </h2>
          </div>
          <div className="grid grid-cols-1 gap-px bg-ink/10 sm:grid-cols-2 lg:grid-cols-4">
            {location.activities.map((a) => (
              <div key={a.title} className="bg-bone p-8">
                <MapPin
                  className="h-6 w-6 text-catalyst"
                  aria-hidden="true"
                />
                <h3 className="mt-4 font-display text-xl font-black text-ink">
                  {a.title}
                </h3>
                <p className="mt-3 text-sm leading-relaxed text-ink/70">
                  {a.body}
                </p>
              </div>
            ))}
          </div>
        </div>
      </BlueprintGrid>

      {/* Services connected to this location */}
      <BlueprintGrid className="bg-bone py-24 lg:py-32">
        <div className="mx-auto max-w-[1600px] px-6 lg:px-10">
          <SectionLabel
            index={`// ${formatNumber(numbering + 2)} — Services`}
            title="Related services"
          />
          <div className="mb-10 max-w-2xl">
            <h2 className="font-display text-4xl font-black leading-[1.05] text-ink lg:text-5xl text-balance">
              Services connected
              <br />
              <span className="text-catalyst">to {location.name}.</span>
            </h2>
            {location.servicesNote && (
              <p className="mt-4 text-lg text-ink/70">
                {location.servicesNote}
              </p>
            )}
          </div>
          <div className="grid grid-cols-1 gap-px bg-ink/10 sm:grid-cols-2 lg:grid-cols-4">
            {location.services.map((s) => (
              <Link
                key={s.href}
                href={s.href}
                className="group bg-bone p-6 transition-colors hover:bg-ink hover:text-bone"
              >
                <h3 className="font-display text-lg font-black">{s.name}</h3>
                <div className="mt-3 flex items-center gap-2 text-sm">
                  <span className="small-caps">View service</span>
                  <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                </div>
              </Link>
            ))}
          </div>
        </div>
      </BlueprintGrid>

      {/* Visiting / contact */}
      <BlueprintGrid className="bg-secondary py-24 lg:py-32">
        <div className="mx-auto max-w-[1600px] px-6 lg:px-10">
          <SectionLabel
            index={`// ${formatNumber(numbering + 3)} — Visiting`}
            title="By appointment"
          />
          <div className="grid grid-cols-1 gap-px bg-ink/10 lg:grid-cols-2">
            <div className="bg-bone p-8 lg:p-12">
              <CalendarCheck
                className="h-8 w-8 text-catalyst"
                strokeWidth={1.5}
                aria-hidden="true"
              />
              <h2 className="mt-6 font-display text-4xl font-black leading-[1.05] text-ink lg:text-5xl text-balance">
                Visits are
                <br />
                <span className="text-catalyst">by appointment.</span>
              </h2>
              <p className="mt-6 max-w-md text-lg leading-relaxed text-ink/70">
                To visit Mogen in {location.name}, arrange an appointment
                first — use the contact page, email or phone below and Mogen
                will confirm a time.
              </p>
              <div className="mt-8">
                <MagneticButton as="a" href="/contact" variant="catalyst">
                  Contact Mogen
                </MagneticButton>
              </div>
            </div>
            <div className="bg-bone p-8 lg:p-12">
              <h3 className="font-display text-2xl font-black text-ink">
                Contact details
              </h3>
              <ul className="mt-8 space-y-6">
                <li className="flex items-start gap-4">
                  <Mail
                    className="h-5 w-5 text-catalyst"
                    strokeWidth={1.5}
                    aria-hidden="true"
                  />
                  <div>
                    <div className="small-caps text-ink/50">Email</div>
                    <a
                      href={`mailto:${siteConfig.email}`}
                      className="mt-1 block font-display text-lg font-bold text-ink hover:text-catalyst"
                    >
                      {siteConfig.email}
                    </a>
                  </div>
                </li>
                <li className="flex items-start gap-4">
                  <Phone
                    className="h-5 w-5 text-catalyst"
                    strokeWidth={1.5}
                    aria-hidden="true"
                  />
                  <div>
                    <div className="small-caps text-ink/50">Phone</div>
                    <a
                      href={`tel:${siteConfig.telephone}`}
                      className="mt-1 block font-display text-lg font-bold text-ink hover:text-catalyst"
                    >
                      {siteConfig.telephoneDisplay}
                    </a>
                  </div>
                </li>
                <li className="flex items-start gap-4">
                  <MapPin
                    className="h-5 w-5 text-catalyst"
                    strokeWidth={1.5}
                    aria-hidden="true"
                  />
                  <div>
                    <div className="small-caps text-ink/50">Area</div>
                    <div className="mt-1 font-display text-lg font-bold text-ink">
                      {location.area}
                    </div>
                  </div>
                </li>
              </ul>
            </div>
          </div>
          {other && (
            <p className="mt-10 text-sm text-ink/60">
              Also see{" "}
              <Link
                href={`/locations/${other.slug}`}
                className="small-caps text-ink hover:text-catalyst"
              >
                Mogen in {other.name} — {other.role.toLowerCase()} →
              </Link>
            </p>
          )}
        </div>
      </BlueprintGrid>

      {/* Next step */}
      <FinalCTA numbering={numbering + 4} auditHref="/#audit" />
    </PageShell>
  );
}
