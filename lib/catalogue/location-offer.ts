/** Pure, testable projection of the stored location offer into public cards. */
export interface CatalogueWebPackage {
  id: string;
  name: string;
  stage: number;
  summary: string;
  description: string;
  websiteIncluded: boolean;
  maxPages: number | null;
  features: string[];
  seoScope: string[];
  exclusions: string[];
  status: string;
  pricingLabel: string;
}
export type CatalogueOfferSlot = {
  kind: "package" | "explore";
  packageId?: string;
  direction?: "smaller" | "larger";
};
export interface CatalogueLocationOffer {
  locationSlug: string;
  featuredPackageId: string;
  slots: CatalogueOfferSlot[];
  seedCallout: string;
}
export interface PublicLocationOffer {
  locationSlug: string;
  featuredPackageId: string;
  seedCallout: string;
  slots: Array<
    | { kind: "package"; package: CatalogueWebPackage; featured: boolean }
    | { kind: "explore"; direction: "smaller" | "larger" }
  >;
}

export function projectLocationOffer(
  offer: CatalogueLocationOffer | undefined,
  packages: CatalogueWebPackage[],
): PublicLocationOffer | null {
  if (!offer || offer.slots.length !== 4) return null;
  const live = new Map(packages.filter(p => p.status === "published").map(p => [p.id, p]));
  const seed = live.get("seed");
  if (!seed || seed.websiteIncluded) return null;
  const shown = new Set<string>();
  const slots: PublicLocationOffer["slots"] = [];
  let featuredCount = 0;
  for (const slot of offer.slots) {
    if (slot.kind === "explore") {
      if (slot.direction !== "smaller" && slot.direction !== "larger") return null;
      slots.push({ kind: "explore", direction: slot.direction });
      continue;
    }
    if (slot.kind !== "package" || !slot.packageId || shown.has(slot.packageId)) return null;
    const pkg = live.get(slot.packageId);
    if (!pkg || !pkg.websiteIncluded) return null;
    shown.add(pkg.id);
    const featured = pkg.id === offer.featuredPackageId;
    if (featured) featuredCount++;
    slots.push({ kind: "package", package: pkg, featured });
  }
  if (featuredCount !== 1) return null;
  return { locationSlug: offer.locationSlug, featuredPackageId: offer.featuredPackageId,
    seedCallout: offer.seedCallout, slots };
}
