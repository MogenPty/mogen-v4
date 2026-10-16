import type { Promotion } from "@/data/promotions";
import { getService } from "@/data/services";

/**
 * Homepage hero service-awareness.
 *
 * The hero follows the featured promotion's service (promotion →
 * package → service chain): when the featured promotion is an SEO offer,
 * the hero is an SEO hero. With no (valid) featured promotion the hero
 * stays Web Development-led — the site-wide default.
 *
 * Physical office locations for the rotating H1 line. The first entry is
 * the SSR/no-JS default so crawlers and non-JS visitors always see a
 * sensible H1 ("…in Maboloka…"); rotation to the other offices happens
 * client-side only.
 */
export const HERO_LOCATIONS = ["Maboloka", "Soshanguve", "Centurion"] as const;

export const DEFAULT_HERO_LOCATION = HERO_LOCATIONS[0];

export const DEFAULT_HERO_SERVICE_SLUG = "web-development";

/**
 * Resolve the hero service from the authoritative featured promotion.
 * Unknown/blank `relatedService` values fall back to Web Development —
 * never render an invalid service as valid.
 */
export function resolveHeroServiceSlug(
  promotion?: Promotion | null,
): string {
  const related = promotion?.relatedService?.trim().toLowerCase();
  if (related) {
    const service = getService(related);
    if (service) return service.slug;
  }
  return DEFAULT_HERO_SERVICE_SLUG;
}

/**
 * Microcopy under the hero CTAs, per service. Web Development keeps the
 * existing questionnaire wording; every other service uses neutral,
 * verified wording (audit is free for SEO per its CTA; quotes are free
 * to request; replies within one business day is the site promise).
 */
export const HERO_MICROCOPY: Record<string, string> = {
  "web-development":
    "Free assessment • Reply in 1 business day • No forced package",
  seo: "Free growth audit • Reply in 1 business day • No pushy sales calls",
  "digital-marketing":
    "Free quote • Reply in 1 business day • No pushy sales calls",
  "business-documentation":
    "Free quote • Reply in 1 business day • No pushy sales calls",
};

export function heroMicrocopy(serviceSlug: string): string {
  return (
    HERO_MICROCOPY[serviceSlug] ??
    "Reply in 1 business day • No pushy sales calls"
  );
}
