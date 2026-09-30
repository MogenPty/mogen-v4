import { describe, expect, it } from "vitest";
import {
  getEffectiveStatus,
  getFeaturedPromotion,
  getPromotionBySlug,
  getPublicPromotions,
  isPromotionExpired,
} from "@/data/promotions";
import { ATTRIBUTION_KEYS, buildEnquiryHref } from "./enquiry";

/**
 * Task 03 — promotion CTA → promotion + service enquiry context.
 *
 * Locks the contract every promotion enquiry CTA must satisfy: the CTA
 * derives `service`/`promotion` from the central promotion data
 * (`promotion.relatedService` / `promotion.slug`) and routes through
 * the single shared Task 01 helper (`buildEnquiryHref`, no
 * promotion-specific parallel implementation).
 *
 * Seed assertions are data-driven (read from the central data, never
 * re-declared) except where this task pins Sprout's slug/service.
 */

const BEFORE_SPROUT = "2026-09-28";
const AFTER_SEED = "2026-11-01";

/** What a wired promotion enquiry CTA must produce. */
function promotionCtaHref(slug: string) {
  const promotion = getPromotionBySlug(slug)!;
  return buildEnquiryHref({
    service: promotion.relatedService,
    promotion: promotion.slug,
  });
}

describe("promotion CTA enquiry routing (Task 03)", () => {
  it("routes the Sprout CTA with service=web-development + promotion=mogen-sprout-first-100", () => {
    const sprout = getPromotionBySlug("mogen-sprout-first-100")!;
    expect(sprout.relatedService).toBe("web-development");
    const params = new URLSearchParams(
      promotionCtaHref("mogen-sprout-first-100").split("?")[1],
    );
    expect(params.get("service")).toBe("web-development");
    expect(params.get("promotion")).toBe("mogen-sprout-first-100");
  });

  it("routes the Seed CTA from the central promotion data (data-driven)", () => {
    const seed = getPromotionBySlug("mogen-seed-r99")!;
    expect(seed.relatedService).toBeDefined();
    const href = promotionCtaHref(seed.slug);
    expect(href.startsWith("/contact?")).toBe(true);
    const params = new URLSearchParams(href.split("?")[1]);
    expect(params.get("promotion")).toBe(seed.slug);
    expect(params.get("service")).toBe(seed.relatedService);
  });

  it("gives every available collection promotion its own slug (no cross-wiring)", () => {
    const available = getPublicPromotions(BEFORE_SPROUT).filter(
      (p) => !isPromotionExpired(p, BEFORE_SPROUT),
    );
    expect(available.length).toBeGreaterThanOrEqual(2);
    for (const promotion of available) {
      const params = new URLSearchParams(
        promotionCtaHref(promotion.slug).split("?")[1],
      );
      expect(params.get("promotion")).toBe(promotion.slug);
      expect(params.get("service")).toBe(promotion.relatedService);
    }
    const slugs = new Set(available.map((p) => p.slug));
    expect(slugs.size).toBe(available.length);
  });

  it("keeps the detail-page contract: available promotions contextualise, expired stay generic", () => {
    // Sprout (scheduled) keeps an available enquiry CTA with full context.
    expect(getEffectiveStatus(getPromotionBySlug("mogen-sprout-first-100")!, BEFORE_SPROUT)).toBe(
      "scheduled",
    );
    const sproutParams = new URLSearchParams(
      promotionCtaHref("mogen-sprout-first-100").split("?")[1],
    );
    expect(sproutParams.get("promotion")).toBe("mogen-sprout-first-100");
    expect(sproutParams.get("service")).toBe("web-development");

    // Seed after 30 Oct 2026 is expired → generic Contact, no promotion context.
    const seed = getPromotionBySlug("mogen-seed-r99")!;
    expect(isPromotionExpired(seed, AFTER_SEED)).toBe(true);
    expect(buildEnquiryHref({})).toBe("/contact");
  });

  it("routes the featured promotion CTA with the featured slug + service", () => {
    const featured = getFeaturedPromotion(BEFORE_SPROUT, false)!;
    expect(featured).toBeDefined();
    const params = new URLSearchParams(
      promotionCtaHref(featured.slug).split("?")[1],
    );
    expect(params.get("promotion")).toBe(featured.slug);
    expect(params.get("service")).toBe(featured.relatedService);
  });

  it("preserves all allowlisted attribution through promotion CTAs", () => {
    const sprout = getPromotionBySlug("mogen-sprout-first-100")!;
    const href = buildEnquiryHref({
      service: sprout.relatedService,
      promotion: sprout.slug,
      attribution: {
        utm_source: "whatsapp",
        utm_medium: "organic_social",
        utm_campaign: "sprout-launch-2026",
        utm_content: "whatsapp-status",
        utm_term: "seed-audience",
        utm_id: "123",
      },
    });
    const params = new URLSearchParams(href.split("?")[1]);
    expect(params.get("service")).toBe("web-development");
    expect(params.get("promotion")).toBe("mogen-sprout-first-100");
    for (const key of ATTRIBUTION_KEYS) {
      expect(params.get(key)).not.toBeNull();
    }
    expect(params.get("utm_source")).toBe("whatsapp");
    expect(params.get("utm_medium")).toBe("organic_social");
    expect(params.get("utm_campaign")).toBe("sprout-launch-2026");
    expect(params.get("utm_content")).toBe("whatsapp-status");
  });

  it("never embeds promotion business data beyond the identifiers", () => {
    for (const promotion of getPublicPromotions(BEFORE_SPROUT)) {
      const href = promotionCtaHref(promotion.slug).toLowerCase();
      for (const banned of [
        "price",
        "setup",
        "monthly",
        "eligibility",
        "description",
      ]) {
        expect(href).not.toContain(banned);
      }
    }
  });
});
