import "server-only";
import {
  getAllPromotionTargets,
  getAllPublicWebPromotionRows,
} from "@/db/catalogue";
import {
  getActivePromotions,
  getFeaturedPromotion,
  getPromotionBySlug,
  getPromotions,
  getPublicPromotions,
  getEffectiveStatus,
  orderPublicPromotions,
  type Promotion,
} from "@/data/promotions";
import { loadPublicWebPriceOptions, databaseCatalogueEnabled } from "./server";
import { projectPromotion, type CampaignTarget } from "./promotion-projection";

async function databasePromotions(): Promise<Promotion[]> {
  const [rows, targets, prices] = await Promise.all([
    getAllPublicWebPromotionRows(),
    getAllPromotionTargets(),
    loadPublicWebPriceOptions(),
  ]);
  if (!prices) return [];
  return rows.flatMap(row => {
    const promotion = projectPromotion(row, targets as CampaignTarget[], prices);
    return promotion ? [promotion] : [];
  });
}

/** Catalogue mode NEVER falls back to hard-coded campaigns. */
export async function loadPublicPromotions(): Promise<Promotion[]> {
  if (!databaseCatalogueEnabled()) return getPublicPromotions();
  return orderPublicPromotions(await databasePromotions());
}
export async function loadActivePromotions(): Promise<Promotion[]> {
  if (!databaseCatalogueEnabled()) return getActivePromotions();
  return (await databasePromotions()).filter(p => getEffectiveStatus(p) === "active");
}
export async function loadFeaturedPromotion(): Promise<Promotion | undefined> {
  if (!databaseCatalogueEnabled()) return getFeaturedPromotion();
  const active = await loadActivePromotions();
  return active.find(p => p.isFeatured);
}
export async function loadPromotionBySlug(slug: string): Promise<Promotion | undefined> {
  if (!databaseCatalogueEnabled()) return getPromotionBySlug(slug);
  return (await databasePromotions()).find(p => p.slug === slug);
}

/** Static paths are legacy-only. New DB slugs resolve dynamically. */
export function getStaticPromotionSlugs(): string[] {
  if (databaseCatalogueEnabled()) return [];
  return getPromotions().map(p => p.slug);
}
