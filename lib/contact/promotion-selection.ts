import type { PromotionPricePoint } from "@/data/promotions";

export interface ContactPromotionChoice {
  slug: string;
  name: string;
  relatedPackage?: string;
  targetPriceOptionIds?: string[];
  pricing: PromotionPricePoint[];
}

export function resolvePromotionForOption(
  promotions: readonly ContactPromotionChoice[],
  selectedPromotionSlug: string,
  packageId: string,
  priceOptionId: string,
): ContactPromotionChoice | undefined {
  const matchesOption = (promotion: ContactPromotionChoice) =>
    promotion.relatedPackage === packageId &&
    (promotion.targetPriceOptionIds ?? []).includes(priceOptionId);
  return promotions.find(promotion =>
    promotion.slug === selectedPromotionSlug && matchesOption(promotion)) ??
    promotions.find(matchesOption);
}
