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
 * Promotion enquiry CTA (Task 03, minimal-context Task 7A).
 *
 * Routes to `/contact` with the promotion identifier only, derived from
 * the central promotion data (`promotion.slug`) via the shared
 * `buildEnquiryHref` helper — never hardcoded per promotion and never
 * carrying business data beyond the identifier. The Contact layer
 * resolves the complete context (promotion → package → service)
 * centrally, so the service slug is not repeated here.
 */
export default function PromotionEnquiryCta({
  promotion,
  attribution,
  variant = "catalyst",
  className,
}: Readonly<Props>) {
  const href = buildEnquiryHref({
    promotion: promotion.slug,
    attribution,
  });
  return (
    <MagneticButton as="a" href={href} variant={variant} className={className}>
      {promotion.cta.label}
    </MagneticButton>
  );
}
