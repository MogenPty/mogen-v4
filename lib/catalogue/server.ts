import "server-only";
import { getPublishedWebPackages, getWebLocationOffer } from "@/db/catalogue";
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
