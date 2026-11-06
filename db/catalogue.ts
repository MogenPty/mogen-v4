import "server-only";
import { and, asc, eq } from "drizzle-orm";
import { getCatalogueDb } from "./client";
import { webLocationOffers, webPackages, webPackagePrices, webPromotions, webPromotionPrices } from "./schema";

export async function getPublishedWebPackages() {
  return getCatalogueDb().select().from(webPackages)
    .where(eq(webPackages.status, "published")).orderBy(asc(webPackages.stage));
}

export async function getPublishedWebPackage(id: string) {
  const results = await getCatalogueDb().select().from(webPackages)
    .where(eq(webPackages.id, id)).limit(1);
  const pkg = results[0];
  return pkg?.status === "published" ? pkg : undefined;
}

export async function getWebLocationOffer(slug: string) {
  const [offer] = await getCatalogueDb().select().from(webLocationOffers)
    .where(eq(webLocationOffers.locationSlug, slug)).limit(1);
  return offer;
}

/** Read-only price options. Draft rows are deliberately available only to admin workflows. */
export async function getWebPackagePriceOptions(packageId: string) {
  return getCatalogueDb().select().from(webPackagePrices)
    .where(eq(webPackagePrices.packageId, packageId))
    .orderBy(asc(webPackagePrices.id));
}

/** Public-facing candidates; callers also apply date/amount guards. */
export async function getPublishedWebPackagePriceOptions(packageId: string) {
  return getCatalogueDb().select().from(webPackagePrices)
    .where(and(eq(webPackagePrices.packageId, packageId), eq(webPackagePrices.status, "published")))
    .orderBy(asc(webPackagePrices.id));
}

/** A campaign may connect to multiple option rows and discounts. */
export async function getWebPromotionPriceTargets(promotionId: string) {
  return getCatalogueDb().select().from(webPromotionPrices)
    .where(eq(webPromotionPrices.promotionId, promotionId));
}

export async function getWebPromotion(id: string) {
  const [promotion] = await getCatalogueDb().select().from(webPromotions)
    .where(eq(webPromotions.id, id)).limit(1);
  return promotion;
}
