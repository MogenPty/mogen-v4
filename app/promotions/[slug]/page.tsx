import { ArrowLeft, Check } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import BlueprintGrid, { SectionLabel } from "@/components/mogen/blueprint-grid";
import ConversionBar from "@/components/mogen/conversation-bar";
import Footer from "@/components/mogen/footer";
import MagneticButton from "@/components/mogen/magnet-button";
import Nav from "@/components/mogen/nav";
import { PromotionStatusBadge } from "@/components/mogen/promotion-card";
import PromotionCarousel from "@/components/mogen/promotion-carousel";
import PromotionEnquiryCta from "@/components/mogen/promotion-enquiry-cta";
import ServiceFAQ from "@/components/mogen/service-faq";
import {
  getEffectiveStatus,
  getPromotionBySlug,
  getPromotions,
  type Promotion,
} from "@/data/promotions";
import { siteConfig } from "@/data/site";
import { parseEnquiryAttribution } from "@/lib/enquiry/enquiry";
import { formatNumber } from "@/lib/utils";

// Date transitions (start/end) and the fallback-featuring env flag take
// effect without a redeploy: pages regenerate at most hourly.
export const revalidate = 3600;

interface Props {
  params: Promise<{ slug: string }>;
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}

export function generateStaticParams() {
  return getPromotions().map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const promo = getPromotionBySlug(slug);
  if (!promo) return { title: "Promotion not found — Mogen" };
  return {
    title: `${promo.name} — Mogen`,
    description: promo.shortDescription,
    openGraph: {
      title: `${promo.name} — Mogen`,
      description: promo.shortDescription,
      url: `${siteConfig.url}/promotions/${promo.slug}`,
    },
  };
}

function formatDate(iso: string): string {
  const [y, m, d] = iso.split("-").map(Number);
  const months = [
    "January",
    "February",
    "March",
    "April",
    "May",
    "June",
    "July",
    "August",
    "September",
    "October",
    "November",
    "December",
  ];
  return `${d} ${months[m - 1]} ${y}`;
}

function StatusBanner({ promo }: Readonly<{ promo: Promotion }>) {
  const status = getEffectiveStatus(promo);
  if (status === "expired") {
    return (
      <div className="border-y-2 border-catalyst bg-ink px-6 py-4 text-center">
        <p className="small-caps text-bone">
          Promotion ended
          {promo.endDate && ` — ran through ${formatDate(promo.endDate)}`}
        </p>
        <p className="mt-1 text-sm text-bone/60">
          Details below remain for reference. This offer is no longer available.
        </p>
      </div>
    );
  }
  if (status === "scheduled") {
    return (
      <div className="border-y border-ink/15 bg-secondary px-6 py-4 text-center">
        <p className="small-caps text-ink">
          Coming soon
          {promo.startDate && ` — starts ${formatDate(promo.startDate)}`}
        </p>
        {promo.maximumCustomers && (
          <p className="mt-1 text-sm text-ink/60">
            Available to the first {promo.maximumCustomers} eligible customers.
          </p>
        )}
      </div>
    );
  }
  return null;
}

function PricingSection({
  promo,
  numbering = 1,
}: Readonly<{ promo: Promotion; numbering?: number }>) {
  return (
    <BlueprintGrid className="bg-bone py-20">
      <div className="mx-auto max-w-[1600px] px-6 lg:px-10">
        <SectionLabel
          index={`// ${formatNumber(numbering)} — Offer`}
          title="Pricing"
        />
        <div className="grid grid-cols-1 gap-px bg-ink/10 md:grid-cols-3">
          {promo.pricing.map((p) => (
            <div key={p.label} className="bg-bone p-8">
              <h3 className="small-caps text-ink/50">{p.label}</h3>
              <div className="mt-4 flex flex-wrap items-baseline gap-x-3">
                {p.promotional ? (
                  <>
                    <span className="font-display text-4xl font-black text-catalyst">
                      {p.promotional}
                    </span>
                    <span className="text-xl text-ink/40 line-through">
                      {p.regular}
                    </span>
                  </>
                ) : (
                  <span className="font-display text-4xl font-black text-ink">
                    {p.regular}
                  </span>
                )}
                {p.cadence && (
                  <span className="text-sm font-semibold text-ink/50">
                    {p.cadence}
                  </span>
                )}
              </div>
              {p.note && <p className="mt-3 text-sm text-ink/60">{p.note}</p>}
            </div>
          ))}
        </div>
        {promo.savingsCallout && (
          <p className="mt-8 border-l-4 border-catalyst bg-secondary px-6 py-4 text-base text-ink/80">
            {promo.savingsCallout}
          </p>
        )}
        {promo.billingNote && (
          <p className="mt-4 max-w-3xl text-sm leading-relaxed text-ink/60">
            {promo.billingNote}
          </p>
        )}
      </div>
    </BlueprintGrid>
  );
}

export default async function PromotionDetailPage({
  params,
  searchParams,
}: Readonly<Props>) {
  const { slug } = await params;
  const promo = getPromotionBySlug(slug);
  if (!promo) notFound();
  // Carry allowlisted attribution (utm_*) from the promotion URL into
  // the enquiry CTAs — explicit promotion context always wins.
  const attribution = parseEnquiryAttribution((await searchParams) ?? {});

  let numbering = 1;
  const status = getEffectiveStatus(promo);

  return (
    <div className="bg-bone">
      <Nav />
      <main>
        {/* HERO */}
        <section className="relative overflow-hidden bg-bone pt-32 pb-16 lg:pt-40">
          <div
            className="pointer-events-none absolute inset-0 z-0 blueprint-grid opacity-50"
            aria-hidden="true"
          />
          <div className="relative z-10 mx-auto max-w-[1600px] px-6 lg:px-10">
            <Link
              href="/promotions"
              className="inline-flex items-center gap-2 small-caps text-muted-foreground hover:text-catalyst"
            >
              <ArrowLeft className="h-4 w-4" aria-hidden="true" />
              All promotions
            </Link>
            <div className="mt-8">
              <PromotionStatusBadge
                status={status}
                isFeatured={promo.isFeatured}
              />
            </div>
            <h1 className="mt-6 max-w-4xl font-display text-5xl font-black leading-[1.02] text-ink lg:text-7xl text-balance">
              {promo.name}
            </h1>
            <p className="mt-6 max-w-2xl text-lg text-ink/70">
              {promo.description}
            </p>
            <div className="mt-4 flex flex-wrap gap-x-6 gap-y-1 text-sm text-ink/50">
              {promo.startDate && (
                <span>Starts {formatDate(promo.startDate)}</span>
              )}
              {promo.endDate && <span>Ends {formatDate(promo.endDate)}</span>}
              {promo.maximumCustomers && (
                <span>First {promo.maximumCustomers} eligible customers</span>
              )}
            </div>
            <div className="mt-10 flex flex-wrap gap-4">
              {status === "expired" ? (
                <MagneticButton as="a" href="/contact" variant="catalyst">
                  Contact Mogen
                </MagneticButton>
              ) : (
                <PromotionEnquiryCta
                  promotion={promo}
                  attribution={attribution}
                />
              )}
              {promo.relatedService && (
                <MagneticButton
                  as="a"
                  href={`/services/${promo.relatedService}`}
                  variant="outline"
                >
                  View service
                </MagneticButton>
              )}
            </div>
          </div>
        </section>

        <StatusBanner promo={promo} />

        {/* PRICING / OFFER */}
        <PricingSection numbering={numbering++} promo={promo} />

        {/* PROMOTIONAL IMAGE CAROUSEL — only when images exist */}
        {promo.images.length > 0 && (
          <BlueprintGrid className="bg-secondary py-20">
            <div className="mx-auto max-w-[1600px] px-6 lg:px-10">
              <SectionLabel
                index={`// ${formatNumber(numbering++)} — Gallery`}
                title="Campaign images"
              />
              <PromotionCarousel
                images={promo.images}
                label={promo.name}
                className="max-w-4xl"
              />
            </div>
          </BlueprintGrid>
        )}

        {/* WHAT'S INCLUDED */}
        {promo.included && promo.included.length > 0 && (
          <BlueprintGrid className="bg-bone py-20">
            <div className="mx-auto max-w-[1600px] px-6 lg:px-10">
              <SectionLabel
                index={`// ${formatNumber(numbering++)} — Included`}
                title="What's included"
              />
              <div className="grid grid-cols-1 gap-px bg-ink/10 sm:grid-cols-2">
                {promo.included.map((item) => (
                  <div
                    key={item}
                    className="flex items-center gap-3 bg-bone p-6"
                  >
                    <Check
                      className="h-5 w-5 shrink-0 text-catalyst"
                      aria-hidden="true"
                    />
                    <span className="text-ink/80">{item}</span>
                  </div>
                ))}
              </div>
            </div>
          </BlueprintGrid>
        )}

        {/* HOW IT WORKS */}
        {promo.howItWorks && promo.howItWorks.length > 0 && (
          <BlueprintGrid className="bg-secondary py-20">
            <div className="mx-auto max-w-[1600px] px-6 lg:px-10">
              <SectionLabel
                index={`// ${formatNumber(numbering++)} — Process`}
                title="How it works"
              />
              <div className="grid grid-cols-1 gap-px bg-ink/10 sm:grid-cols-2 lg:grid-cols-5">
                {promo.howItWorks.map((step, i) => (
                  <div key={step.title} className="bg-bone p-6">
                    <span className="font-display text-4xl font-black text-catalyst">
                      {formatNumber(i + 1)}
                    </span>
                    <h3 className="mt-4 font-display text-lg font-black text-ink">
                      {step.title}
                    </h3>
                    <p className="mt-2 text-sm text-ink/70">
                      {step.description}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </BlueprintGrid>
        )}

        {/* TERMS / ELIGIBILITY */}
        <BlueprintGrid className="bg-bone py-20">
          <div className="mx-auto grid max-w-[1600px] grid-cols-1 gap-12 px-6 lg:grid-cols-2 lg:px-10">
            <div>
              <SectionLabel
                index={`// ${formatNumber(numbering++)} — Eligibility`}
                title="Eligibility"
              />
              <ul className="space-y-3 text-ink/80">
                {promo.eligibility.map((e) => (
                  <li key={e} className="flex gap-2">
                    <span
                      className="mt-2 h-1 w-1 shrink-0 bg-catalyst"
                      aria-hidden="true"
                    />
                    {e}
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <SectionLabel
                index={`// ${formatNumber(numbering++)} — Terms`}
                title="Terms"
              />
              <ul className="space-y-3 text-sm text-ink/70">
                {promo.terms.map((t) => (
                  <li key={t} className="flex gap-2">
                    <span
                      className="mt-2 h-1 w-1 shrink-0 bg-ink/30"
                      aria-hidden="true"
                    />
                    {t}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </BlueprintGrid>

        {/* FAQ */}
        {promo.faqs && promo.faqs.length > 0 && (
          <BlueprintGrid className="bg-bone pb-20 lg:pb-28">
            <div className="mx-auto max-w-225 px-6 lg:px-10">
              <SectionLabel
                index={`// ${formatNumber(numbering++)} — Questions`}
                title="FAQ"
              />
              <h2 className="mb-10 font-display text-4xl font-black leading-[1.05] text-ink lg:text-5xl text-balance">
                Frequently asked questions
              </h2>
              <ServiceFAQ faq={promo.faqs} />
            </div>
          </BlueprintGrid>
        )}

        {/* CTA */}
        <BlueprintGrid id={"claim"} className="bg-ink py-20 text-bone lg:py-28">
          <div className="mx-auto max-w-[1600px] px-6 lg:px-10">
            <div className="grid grid-cols-1 gap-12 lg:grid-cols-2 lg:gap-20">
              <div>
                <span className="small-caps text-catalyst">
                  {`// ${formatNumber(numbering++)} — Start`}
                </span>
                <h2 className="mt-6 font-display text-4xl font-black leading-[1.05] lg:text-6xl text-balance">
                  {getPromoStatusComponent(promo)}
                </h2>
                <p className="mt-6 max-w-md text-lg text-bone/70">
                  {status === "expired"
                    ? "This promotion is no longer available, but we can still help — send us your details and we will suggest the closest current option."
                    : "Send us your details and we will confirm eligibility and next steps within one business day — no obligation."}
                </p>
              </div>
              <div className="flex flex-col justify-center gap-4">
                {status === "expired" ? (
                  <MagneticButton
                    as="a"
                    href="/contact"
                    variant="catalyst"
                    className="w-fit"
                  >
                    Contact Mogen
                  </MagneticButton>
                ) : (
                  <PromotionEnquiryCta
                    promotion={promo}
                    attribution={attribution}
                    className="w-fit"
                  />
                )}
                <Link
                  href="/promotions"
                  className="small-caps text-bone/60 hover:text-bone"
                >
                  ← Back to all promotions
                </Link>
              </div>
            </div>
          </div>
        </BlueprintGrid>
      </main>
      <Footer />
      <ConversionBar />
    </div>
  );

  function getPromoStatusComponent(
    promo: Promotion,
  ): import("react").ReactNode {
    if (status === "expired")
      return (
        <>
          This offer has <span className="text-catalyst">ended.</span>
        </>
      );

    if (status === "scheduled")
      return (
        <>
          Starts{" "}
          <span className="text-catalyst">
            {promo.startDate && formatDate(promo.startDate)}.
          </span>
        </>
      );

    return (
      <>
        Claim <span className="text-catalyst">{promo.name}.</span>
      </>
    );
  }
}
