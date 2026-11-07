import "server-only";
import { getPublishedWebPackages, getPublishedWebPriceOptions, getWebLocationOffer } from "@/db/catalogue";
import { isPublicWebPrice, type WebPriceOption } from "./commercial";
import { projectLocationOffer } from "./location-offer";

/** Explicit opt-in. Do not enable until pricing, promotions and enquiries are validated. */
export function databaseCatalogueEnabled(): boolean {
  return process.env.MOGEN_WEB_CATALOGUE_SOURCE === "database";
}

export async function loadPublishedWebCatalogue() {
  if (!databaseCatalogueEnabled()) return null;
  return getPublishedWebPackages();
}

export async function loadLocationWebOffer(slug: string) {
  if (!databaseCatalogueEnabled()) return null;
  const [packages, location] = await Promise.all([
    getPublishedWebPackages(),
    getWebLocationOffer(slug),
  ]);
  return projectLocationOffer(location, packages);
}

/**
 * Pricing options remain invisible until BOTH parent package and payment row
 * are published, monetary fields are approved, and effective dates are valid.
 */
export async function loadPublicWebPriceOptions(): Promise<WebPriceOption[] | null> {
  if (!databaseCatalogueEnabled()) return null;
  const [packages, prices] = await Promise.all([
    getPublishedWebPackages(),
    getPublishedWebPriceOptions(),
  ]);
  const ids = new Set(packages.map(pkg => pkg.id));
  return prices
    .filter(price => isPublicWebPrice(price as WebPriceOption, ids))
    .map(price => ({
      id: price.id,
      packageId: price.packageId,
      billingMode: price.billingMode,
      status: price.status,
      currency: price.currency,
      amountCents: price.amountCents,
      setupFeeCents: price.setupFeeCents,
      depositPercent: price.depositPercent,
      minimumMonths: price.minimumMonths,
      initialHostingMonths: price.initialHostingMonths,
      hostingResponsibility: price.hostingResponsibility,
      maintenanceResponsibility: price.maintenanceResponsibility,
      handoverPolicy: price.handoverPolicy,
      effectiveFrom: price.effectiveFrom,
      effectiveUntil: price.effectiveUntil,
    } as WebPriceOption));
}
