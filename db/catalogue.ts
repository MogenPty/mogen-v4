import "server-only";
import { asc, eq } from "drizzle-orm";
import { getCatalogueDb } from "./client";
import { webLocationOffers, webPackages } from "./schema";

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
