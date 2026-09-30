import Link from "next/link";
import {
  getFeaturedPromotion,
  type Promotion as PromotionData,
} from "@/data/promotions";
import type { EnquiryAttribution } from "@/lib/enquiry/enquiry";
import { formatNumber } from "@/lib/utils";
import BlueprintGrid, { SectionLabel } from "./blueprint-grid";
import MagneticButton from "./magnet-button";
import PromotionEnquiryCta from "./promotion-enquiry-cta";

interface Props {
  numbering?: number;
  /**
   * Attribution carried from the homepage URL (utm_* only).
   * Forwarded into the featured enquiry CTA via the shared Task 01
   * helper — never rendered as copy.
   */
  attribution?: EnquiryAttribution;
  /**
   * Explicitly featured promotion supplied by the homepage (which reads
   * it from the central `getFeaturedPromotion()` selector). When omitted
   * the section resolves it directly — same source, same rules.
   */
  promotion?: PromotionData;
}

export default function Promotion({
  numbering = 1,
  attribution,
  promotion: promotionProp,
}: Readonly<Props>) {
  // Homepage shows only an active + explicitly featured promotion.
  // When none qualifies, no section is rendered at all.
  const promo = promotionProp ?? getFeaturedPromotion();
  if (!promo) return null;

  const headline = promo.pricing.find((p) => p.promotional) ?? promo.pricing[0];

  return (
    <BlueprintGrid id={"promotion"} className="bg-bone py-24 lg:py-32">
      <div className="mx-auto max-w-[1600px] px-6 lg:px-10">
        <SectionLabel
          index={`// ${formatNumber(numbering)} — Promotion`}
          title="Current Offer"
        />
        <div className="grid grid-cols-1 gap-px bg-ink/10 lg:grid-cols-[1.2fr_0.8fr]">
          <div className="bg-bone p-8 lg:p-12">
            <span className="small-caps text-catalyst">Featured</span>
            <h2 className="mt-3 font-display text-4xl font-black leading-[1.05] text-ink lg:text-5xl text-balance">
              {promo.name}
            </h2>
            <p className="mt-4 max-w-xl text-lg leading-relaxed text-ink/70">
              {promo.shortDescription}
            </p>
            {headline && (
              <>
                <div className="mt-8 flex items-baseline gap-4">
                  <span className="font-display text-5xl font-black text-catalyst lg:text-6xl">
                    {headline.promotional ?? headline.regular}
                  </span>
                  {headline.promotional && (
                    <span className="text-xl text-ink/40 line-through">
                      {headline.regular}
                    </span>
                  )}
                </div>
                {headline.note && (
                  <p className="mt-2 text-sm text-ink/60">{headline.note}</p>
                )}
              </>
            )}
            <div className="mt-8 flex flex-wrap gap-4">
              <PromotionEnquiryCta
                promotion={promo}
                attribution={attribution}
              />
              <MagneticButton
                as="a"
                href={`/promotions/${promo.slug}`}
                variant="outline"
              >
                Promotion details
              </MagneticButton>
            </div>
          </div>
          <div className="flex flex-col justify-between bg-ink p-8 text-bone lg:p-12">
            <div>
              <h3 className="font-display text-xl font-black">
                What&apos;s included
              </h3>
              <ul className="mt-6 space-y-3 text-sm text-bone/80">
                {(promo.included ?? []).map((item) => (
                  <li key={item} className="flex gap-2">
                    <span
                      className="mt-1 h-1 w-1 shrink-0 bg-catalyst"
                      aria-hidden="true"
                    />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
            <div className="mt-10 border-t border-bone/10 pt-6">
              <p className="text-sm text-bone/60">
                This is {promo.name} — a limited promotional offer.
              </p>
              <div className="mt-3 flex flex-wrap items-center justify-between gap-x-6 gap-y-2">
                <Link
                  href="/contact"
                  className="inline-flex small-caps text-catalyst hover:text-bone"
                >
                  Questions? Contact us →
                </Link>
                <Link
                  href="/promotions"
                  className="inline-flex small-caps text-bone/60 hover:text-bone"
                >
                  All promotions →
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </BlueprintGrid>
  );
}
