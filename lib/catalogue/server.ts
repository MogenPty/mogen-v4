import "server-only";
import { getPublishedWebPackages, getWebLocationOffer } from "@/db/catalogue";
import { projectLocationOffer } from "./location-offer";

/** Deliberate opt-in: no DB reads or public catalogue changes unless enabled. */
export async function loadLocationWebOffer(slug: string) {
  if (process.env.MOGEN_WEB_CATALOGUE_SOURCE !== "database") return null;
  const [packages, location] = await Promise.all([
    getPublishedWebPackages(),
    getWebLocationOffer(slug),
  ]);
  return projectLocationOffer(location, packages);
}
