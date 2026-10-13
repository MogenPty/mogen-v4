import {
  formatPromotionPrice,
  type Promotion,
} from "@/data/promotions";
import type { WebsiteRecommendation } from "./recommendation";

/**
 * Phase 3 promotion-aware pricing for the website-requirements
 * questionnaire.
 *
 * When an active promotion targets the recommended package, the panel
 * shows the promotion's own price points (from `data/promotions.ts` —
 * never invented) instead of the standard managed/once-off figures.
 * Eligibility, allocation caps and durations are confirmed by Mogen on
 * enquiry; the questionnaire only displays what the promotion data
 * states.
 */

export interface PromotionPriceLine {
  label: string;
  /** Promotional price, or the regular price when not discounted. */
  price: string;
  /** Regular price, present only when discounted. */
  regular?: string;
  /** Clarification from the promotion data (e.g. duration limits). */
  note?: string;
}

/**
 * Find the promotion targeting a package (case-insensitive).
 * Callers pass server-resolved active promotions, so expiry and
 * scheduling are already honoured — this only matches the package.
 */
export function findPackagePromotion(
  promotions: Promotion[] | undefined,
  packageId: string,
): Promotion | undefined {
  if (!promotions) return undefined;
  const wanted = packageId.trim().toLowerCase();
  if (!wanted) return undefined;
  return promotions.find(
    (p) => p.relatedPackage?.trim().toLowerCase() === wanted,
  );
}

/**
 * Resolve the promotion to display for a recommendation, if any.
 *
 * Two conditions, both required:
 *
 * 1. An active promotion targets the recommended package.
 * 2. The visitor's billing mode is a managed subscription. Promotions
 *    discount the managed purchase mode (setup + monthly) — they never
 *    apply to self-hosted once-off builds, so a once-off recommendation
 *    always shows the once-off figures instead of a subscription promo.
 */
export function resolveDisplayPromotion(
  promotions: Promotion[] | undefined,
  recommendation: WebsiteRecommendation,
): Promotion | undefined {
  if (!recommendation.packageId) return undefined;
  if (recommendation.billing !== "subscription") return undefined;
  return findPackagePromotion(promotions, recommendation.packageId);
}

/** Render a promotion's price points as display lines. */
export function promotionPriceLines(
  promotion: Promotion,
): PromotionPriceLine[] {
  return promotion.pricing.map((p) => ({
    label: p.label,
    price: formatPromotionPrice(p.promotional ?? p.regular, p.cadence),
    regular: p.promotional
      ? formatPromotionPrice(p.regular, p.cadence)
      : undefined,
    note: p.note,
  }));
}
