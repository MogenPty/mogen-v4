"use client";

import { ArrowRight } from "lucide-react";
import type { Promotion } from "@/data/promotions";
import { formatPromotionPrice, getEffectiveStatus, getFeaturedPricePoint, getPromotionStatusLabel } from "@/data/promotions";
import { buildEnquiryHref, withAttribution } from "@/lib/enquiry/enquiry";
import MagneticButton from "./magnet-button";

interface PromotionCardProps {
  promotion: Promotion;
  /** UTM attribution forwarded into enquiry destinations. */
  attribution?: import("@/lib/enquiry/enquiry").EnquiryAttribution;
  /** Called when "Enquire" CTA is clicked — opens enquiry modal with promo context. Optional; falls back to promotion CTA link. */
  onEnquireClick?: (promo: Promotion) => void;
}

export default function HomepagePromotionCard({
  promotion,
  attribution,
  onEnquireClick,
}: Readonly<PromotionCardProps>) {
  const price = getFeaturedPricePoint(promotion);
  const discountValue = price?.promotional ?? price?.regular ?? "";
  const discountCadence = price?.cadence ?? "";
  const regularValue = price?.regular ?? "";
  const regularCadence = price?.cadence ?? "";
  const status = getEffectiveStatus(promotion);

  return (
    <section
      id="promotion"
      className="relative bg-catalyst text-white py-20 lg:py-28"
      aria-labelledby="promotion-heading"
    >
      <div className="mx-auto max-w-[1600px] px-6 lg:px-10">
        <span className="small-caps text-white/70">{status === "active" ? "Active Offer" : getPromotionStatusLabel(status)}</span>
        <h2 id="promotion-heading" className="mt-3 font-display text-4xl font-black leading-[1.05] lg:text-5xl text-balance">
          {promotion.name}
        </h2>
        <p className="mt-4 max-w-2xl text-lg leading-relaxed text-white/85">
          {promotion.shortDescription}
        </p>

        {price && (
          <div className="mt-8 flex flex-col gap-4 lg:flex-row lg:items-end lg:gap-8">
            <div className="flex flex-col gap-1">
              <span className="font-display text-4xl font-black leading-none break-words sm:text-5xl lg:text-6xl">
                {formatPromotionPrice(discountValue, discountCadence)}
              </span>
              {price.promotional && regularValue && (
                <span className="text-lg break-words text-white/40 line-through sm:text-xl">
                  {formatPromotionPrice(regularValue, regularCadence)}
                </span>
              )}
            </div>
            {price.note && (
              <p className="mt-2 text-sm text-white/70">{price.note}</p>
            )}
          </div>
        )}

        <div className="mt-8 flex flex-wrap gap-4">
          {status === "active" && <MagneticButton
            as={onEnquireClick ? "button" : "a"}
            type={onEnquireClick ? "button" : undefined}
            href={onEnquireClick ? undefined : buildEnquiryHref({ promotion: promotion.slug, attribution })}
            variant="solid-on-dark"
            onClick={onEnquireClick ? () => onEnquireClick(promotion) : undefined}
          >
            Enquire with this offer <ArrowRight className="h-4 w-4" />
          </MagneticButton>}
          <MagneticButton
            as="a"
            href={withAttribution(`/promotions/${promotion.slug}`, attribution)}
            variant="outline-on-dark"
          >
            View details <ArrowRight className="h-4 w-4" />
          </MagneticButton>
        </div>

        <p className="mt-6 text-sm text-white/60">
          {promotion.terms[0] ?? "Terms apply — see promotion details."}
        </p>
      </div>
    </section>
  );
}
