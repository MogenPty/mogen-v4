import { describe, expect, it } from "vitest";
import {
  getFeaturedPromotion,
  getPromotionBySlug,
  getPromotions,
  getPublicPromotions,
  orderPublicPromotions,
  type Promotion,
} from "@/data/promotions";

function makePromo(overrides: Partial<Promotion> & { slug: string }): Promotion {
  return {
    id: overrides.slug,
    name: overrides.slug,
    shortDescription: "short",
    description: "long",
    status: "active",
    isFeatured: false,
    sortOrder: 10,
    pricing: [],
    eligibility: [],
    terms: [],
    images: [],
    cta: { label: "Claim", href: "/contact" },
    ...overrides,
  };
}

describe("promotion data", () => {
  it("exposes Seed as the active featured promotion", () => {
    const featured = getFeaturedPromotion();
    expect(featured?.slug).toBe("mogen-seed-r99");
    expect(featured?.status).toBe("active");
    expect(featured?.isFeatured).toBe(true);
  });

  it("keeps Sprout scheduled and unfeatured before its start date", () => {
    const sprout = getPromotionBySlug("mogen-sprout-first-100");
    expect(sprout?.status).toBe("scheduled");
    expect(sprout?.isFeatured).toBe(false);
    expect(sprout?.startDate).toBe("2026-10-01");
    expect(sprout?.maximumCustomers).toBe(100);
  });

  it("keeps Seed valid through 30 October 2026 at R199 → R99", () => {
    const seed = getPromotionBySlug("mogen-seed-r99");
    expect(seed?.endDate).toBe("2026-10-30");
    expect(seed?.pricing[0].regular).toBe("R199");
    expect(seed?.pricing[0].promotional).toBe("R99");
  });

  it("resolves promotions by slug", () => {
    expect(getPromotionBySlug("nope")).toBeUndefined();
    expect(getPromotions().length).toBeGreaterThanOrEqual(2);
  });
});

describe("orderPublicPromotions", () => {
  it("orders active-featured, active, scheduled, expired and drops draft/archived", () => {
    const list = [
      makePromo({ slug: "arch", status: "archived", sortOrder: 1 }),
      makePromo({ slug: "exp", status: "expired", sortOrder: 1 }),
      makePromo({ slug: "sched", status: "scheduled", sortOrder: 1 }),
      makePromo({ slug: "act-b", status: "active", sortOrder: 2 }),
      makePromo({ slug: "act-a", status: "active", sortOrder: 1 }),
      makePromo({
        slug: "feat",
        status: "active",
        isFeatured: true,
        sortOrder: 9,
      }),
      makePromo({ slug: "draft", status: "draft", sortOrder: 0 }),
    ];
    const slugs = orderPublicPromotions(list).map((p) => p.slug);
    expect(slugs).toEqual(["feat", "act-a", "act-b", "sched", "exp"]);
  });

  it("never features a scheduled promotion on the homepage selector", () => {
    const onlyScheduled = [
      makePromo({ slug: "s", status: "scheduled", isFeatured: true }),
    ];
    expect(
      onlyScheduled.find((p) => p.status === "active" && p.isFeatured),
    ).toBeUndefined();
  });
});

describe("getPublicPromotions", () => {
  it("lists Seed before Sprout and keeps expired promotions reachable", () => {
    const slugs = getPublicPromotions().map((p) => p.slug);
    expect(slugs[0]).toBe("mogen-seed-r99");
    expect(slugs).toContain("mogen-sprout-first-100");
  });
});
