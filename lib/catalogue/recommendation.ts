import type { CatalogueWebPackage } from "./location-offer";

/**
 * Scoped recommendation from currently published DB rows.
 * Preference is a minimum capability indication, never a promise that
 * complex work is included without discovery or a quotation.
 */
export type CatalogueNeed = "first" | "brochure" | "growth" | "marketing" | "booking" | "custom";
const MIN_STAGE: Record<CatalogueNeed, number> = {
  first: 2,
  brochure: 3,
  growth: 4,
  marketing: 5,
  booking: 6,
  custom: 7,
};
export function recommendCataloguePackage(
  packages: CatalogueWebPackage[],
  need: CatalogueNeed,
): CatalogueWebPackage | undefined {
  return packages
    .filter(p => p.status === "published" && p.websiteIncluded)
    .sort((a, b) => a.stage - b.stage)
    .find(p => p.stage >= MIN_STAGE[need]);
}
