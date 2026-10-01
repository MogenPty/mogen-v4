import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  getEffectiveStatus,
  getFeaturedPromotion,
  getPromotionBySlug,
  getPublicPromotions,
} from "@/data/promotions";
import { buildEnquiryHref } from "@/lib/enquiry/enquiry";

const BEFORE_SPROUT = "2026-09-28";
const SPROUT_LIVE = "2026-10-15";
const AFTER_SEED = "2026-11-01";

function readSource(relativePath: string): string {
  return readFileSync(join(process.cwd(), relativePath), "utf8");
}

describe("promotion discovery — navigation", () => {
  it("contains a single Promotions entry pointing to /promotions", () => {
    const source = readSource("components/mogen/nav.tsx");
    const matches = source.match(/\{[^}]*label:\s*"Promotions"[^}]*\}/g) ?? [];
    expect(matches.length).toBe(1);
    expect(matches[0]).toContain('"/promotions"');
  });

  it("drives both desktop and mobile menus from the same NAV array", () => {
    const source = readSource("components/mogen/nav.tsx");
    // Both desktop (hidden lg:flex) and mobile (lg:hidden) sections map NAV.
    const navMaps = source.match(/\{NAV\.map\(/g) ?? [];
    expect(navMaps.length).toBeGreaterThanOrEqual(2);
    // No separate hardcoded mobile-only Promotions link.
    const promotionsOccurrences = source.match(/Promotions/g) ?? [];
    expect(promotionsOccurrences.length).toBe(1);
  });

  it("mobile menu closes after navigation (existing behaviour intact)", () => {
    const source = readSource("components/mogen/nav.tsx");
    expect(source).toContain("onClick={() => setOpen(false)}");
  });
});

describe("promotion discovery — footer", () => {
  it("contains a Promotions link pointing to /promotions", () => {
    const source = readSource("components/mogen/footer.tsx");
    expect(source).toContain('"Promotions"');
    expect(source).toContain('"/promotions"');
  });

  it("uses an internal route (no external URL for Promotions)", () => {
    const source = readSource("components/mogen/footer.tsx");
    const lines = source.split("\n").filter((l) => l.includes("Promotions"));
    for (const line of lines) {
      expect(line).not.toMatch(/https?:\/\//);
    }
  });

  it("does not duplicate the Promotions footer link", () => {
    const source = readSource("components/mogen/footer.tsx");
    const matches = source.match(/Promotions/g) ?? [];
    expect(matches.length).toBe(1);
  });
});

describe("promotion discovery — featured promotion", () => {
  it("homepage receives the explicitly featured promotion from central data", () => {
    const featured = getFeaturedPromotion(BEFORE_SPROUT, false);
    expect(featured?.slug).toBe("mogen-seed-r99");
    expect(featured?.isFeatured).toBe(true);
    expect(getEffectiveStatus(featured!, BEFORE_SPROUT)).toBe("active");
  });

  it("does not automatically feature Sprout merely because it becomes active", () => {
    const sprout = getPromotionBySlug("mogen-sprout-first-100")!;
    expect(getEffectiveStatus(sprout, SPROUT_LIVE)).toBe("active");
    expect(sprout.isFeatured).toBe(false);
    // Seed is still the featured promotion while both are active.
    expect(getFeaturedPromotion(SPROUT_LIVE, false)?.slug).toBe(
      "mogen-seed-r99",
    );
  });

  it("does not select an active promotion via sortOrder as a substitute for isFeatured", () => {
    // After Seed expires, Sprout is active but unfeatured → no featured promotion.
    expect(getFeaturedPromotion(AFTER_SEED, false)).toBeUndefined();
  });

  it("never features an expired promotion", () => {
    const seed = getPromotionBySlug("mogen-seed-r99")!;
    expect(getEffectiveStatus(seed, AFTER_SEED)).toBe("expired");
    expect(getFeaturedPromotion(AFTER_SEED, false)?.slug).not.toBe(seed.slug);
  });

  it("homepage omits the featured section when there is no featured promotion", () => {
    const homeSource = readSource("app/page.tsx");
    // Conditional render driven by the central selector result.
    expect(homeSource).toContain("getFeaturedPromotion()");
    expect(homeSource).toMatch(/\{promotion && \(/);
    const promotionSource = readSource("components/mogen/promotion.tsx");
    // Component renders nothing (no empty container / broken CTA) when none qualifies.
    expect(promotionSource).toMatch(/if\s*\(!promo\)\s*return null/);
  });
});

describe("promotion discovery — homepage CTA and detail link", () => {
  it("homepage passes the featured promotion object into the section", () => {
    const homeSource = readSource("app/page.tsx");
    expect(homeSource).toContain("promotion={promotion}");
  });

  it("featured promotion CTA derives service + slug via the shared enquiry helper", () => {
    const featured = getFeaturedPromotion(BEFORE_SPROUT, false)!;
    const href = buildEnquiryHref({
      service: featured.relatedService,
      promotion: featured.slug,
    });
    expect(href.startsWith("/contact?")).toBe(true);
    const params = new URLSearchParams(href.split("?")[1]);
    expect(params.get("promotion")).toBe(featured.slug);
    expect(params.get("service")).toBe(featured.relatedService);
  });

  it("promotion section uses the shared PromotionEnquiryCta (no homepage-specific helper)", () => {
    const source = readSource("components/mogen/promotion.tsx");
    expect(source).toContain("PromotionEnquiryCta");
    expect(source).toContain("promotion={promo}");
    // No manually duplicated query construction or parallel helper.
    expect(source).not.toContain("/contact?service");
    expect(source).not.toContain("/contact?promotion");
    expect(source).not.toContain("buildEnquiryHref");
  });

  it("detail link is data-driven (/promotions/<slug>), not hardcoded", () => {
    const source = readSource("components/mogen/promotion.tsx");
    expect(source).toContain("`/promotions/${promo.slug}`");
    expect(source).not.toContain("mogen-sprout-first-100");
    expect(source).not.toContain("mogen-seed-r99");
  });

  it("renders promotion fields generically from the promotion object", () => {
    const source = readSource("components/mogen/promotion.tsx");
    for (const field of [
      "promo.name",
      "promo.shortDescription",
      "promo.pricing",
      "promo.included",
    ]) {
      expect(source).toContain(field);
    }
  });
});

describe("promotion discovery — collection remains the hub", () => {
  it("/promotions lists both Seed and Sprout without removing expired entries", () => {
    const slugs = getPublicPromotions(AFTER_SEED).map((p) => p.slug);
    expect(slugs).toContain("mogen-seed-r99");
    expect(slugs).toContain("mogen-sprout-first-100");
  });

  it("homepage links to the full collection for discovery", () => {
    const source = readSource("components/mogen/promotion.tsx");
    // Attribution-preserving link still targets the collection hub.
    expect(source).toContain('"/promotions"');
    expect(source).toContain("withAttribution");
  });
});
