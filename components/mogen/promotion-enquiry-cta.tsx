import MagneticButton from "./magnet-button";
import {
  buildEnquiryHref,
  type EnquiryAttribution,
} from "@/lib/enquiry/enquiry";
import type { Promotion } from "@/data/promotions";

interface Props {
  promotion: Promotion;
  /**
   * Attribution carried from the promotion page URL (utm_* only).
   * Forwarded into the enquiry URL via the shared Task 01 helper —
   * never rendered as copy and never mixed with business data.
   */
  attribution?: EnquiryAttribution;
  variant?: string;
  className?: string;
}

/**
 * Promotion enquiry CTA (Task 03).
 *
 * Routes to `/contact` with both the promotion context and its
 * associated service context, derived from the central promotion data
 * (`promotion.slug` / `promotion.relatedService`) via the shared
 * Task 01 `buildEnquiryHref` helper — never hardcoded per promotion
 * and never carrying business data beyond the identifiers.
 */
export default function PromotionEnquiryCta({
  promotion,
  attribution,
  variant = "catalyst",
  className,
}: Readonly<Props>) {
  const href = buildEnquiryHref({
    service: promotion.relatedService,
    promotion: promotion.slug,
    attribution,
  });
  return (
    <MagneticButton as="a" href={href} variant={variant} className={className}>
      {promotion.cta.label}
    </MagneticButton>
  );
}
