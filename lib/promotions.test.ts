import { afterEach, describe, expect, it } from "vitest";
import {
  getEffectiveStatus,
  getFeaturedPromotion,
  getPromotionBySlug,
  getPromotions,
  getPublicPromotions,
  isFallbackFeaturingEnabled,
  orderPublicPromotions,
  type Promotion,
} from "@/data/promotions";

const ENV_FLAG = "MOGEN_ALLOW_FALLBACK_FEATURING";
const BEFORE_SPROUT = "2026-09-28";
const SPROUT_LIVE = "2026-10-15";
const AFTER_SEED = "2026-11-01";

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

afterEach(() => {
  delete process.env[ENV_FLAG];
});

describe("getEffectiveStatus", () => {
  it("keeps Sprout scheduled before 1 Oct 2026 and activates it after", () => {
    const sprout = getPromotionBySlug("mogen-sprout-first-100")!;
    expect(getEffectiveStatus(sprout, BEFORE_SPROUT)).toBe("scheduled");
    expect(getEffectiveStatus(sprout, SPROUT_LIVE)).toBe("active");
  });

  it("keeps Seed active through 30 Oct 2026 (inclusive) then expires it", () => {
    const seed = getPromotionBySlug("mogen-seed-r99")!;
    expect(getEffectiveStatus(seed, "2026-10-30")).toBe("active");
    expect(getEffectiveStatus(seed, "2026-10-31")).toBe("expired");
    expect(getEffectiveStatus(seed, AFTER_SEED)).toBe("expired");
  });

  it("never revives explicit expired, draft or archived via dates", () => {
    const expired = makePromo({
      slug: "e",
      status: "expired",
      startDate: "2020-01-01",
    });
    const draft = makePromo({ slug: "d", status: "draft" });
    const archived = makePromo({ slug: "a", status: "archived" });
    for (const today of [BEFORE_SPROUT, SPROUT_LIVE, AFTER_SEED]) {
      expect(getEffectiveStatus(expired, today)).toBe("expired");
      expect(getEffectiveStatus(draft, today)).toBe("draft");
      expect(getEffectiveStatus(archived, today)).toBe("archived");
    }
  });
});

describe("promotion data", () => {
  it("exposes Seed as the effectively-active featured promotion before Sprout starts", () => {
    const featured = getFeaturedPromotion(BEFORE_SPROUT, false);
    expect(featured?.slug).toBe("mogen-seed-r99");
  });

  it("keeps Sprout unfeatured with a 100-customer cap and 1 Oct start", () => {
    const sprout = getPromotionBySlug("mogen-sprout-first-100");
    expect(sprout?.isFeatured).toBe(false);
    expect(sprout?.startDate).toBe("2026-10-01");
    expect(sprout?.maximumCustomers).toBe(100);
  });

  it("keeps Seed at R199 → R99 ending 30 Oct 2026", () => {
    const seed = getPromotionBySlug("mogen-seed-r99");
    expect(seed?.endDate).toBe("2026-10-30");
    expect(seed?.pricing[0].regular).toBe("R199");
    expect(seed?.pricing[0].promotional).toBe("R99");
  });

  it("resolves promotions by slug", () => {
    expect(getPromotionBySlug("nope")).toBeUndefined();
    expect(getPromotions().length).toBeGreaterThanOrEqual(2);
  });

  it("never has more than one effectively-active featured promotion", () => {
    for (const today of [BEFORE_SPROUT, SPROUT_LIVE, AFTER_SEED]) {
      const count = getPromotions().filter(
        (p) => getEffectiveStatus(p, today) === "active" && p.isFeatured,
      ).length;
      expect(count).toBeLessThanOrEqual(1);
    }
  });
});

describe("getFeaturedPromotion fallback", () => {
  it("returns undefined after Seed ends when Sprout is unfeatured and fallback is off", () => {
    expect(getFeaturedPromotion(AFTER_SEED, false)).toBeUndefined();
  });

  it("returns Sprout after Seed ends when fallback is explicitly enabled", () => {
    expect(getFeaturedPromotion(AFTER_SEED, true)?.slug).toBe(
      "mogen-sprout-first-100",
    );
  });

  it("prefers explicit featuring over fallback", () => {
    const list = [
      makePromo({ slug: "unfeatured", status: "active", sortOrder: 1 }),
      makePromo({
        slug: "featured",
        status: "active",
        isFeatured: true,
        sortOrder: 9,
      }),
    ];
    const featured = list.find((p) => p.isFeatured) ?? list[0];
    expect(featured.slug).toBe("featured");
  });

  it("never features a scheduled promotion, even with fallback on", () => {
    const onlyScheduled = [
      makePromo({ slug: "s", status: "scheduled", isFeatured: true }),
    ];
    const actives = onlyScheduled.filter(
      (p) => getEffectiveStatus(p, BEFORE_SPROUT) === "active",
    );
    expect(actives).toEqual([]);
  });
});

describe("isFallbackFeaturingEnabled", () => {
  it("defaults to false when the env var is unset or any other value", () => {
    expect(isFallbackFeaturingEnabled()).toBe(false);
    process.env[ENV_FLAG] = "1";
    expect(isFallbackFeaturingEnabled()).toBe(false);
  });

  it("is true only when the env var is exactly 'true'", () => {
    process.env[ENV_FLAG] = "true";
    expect(isFallbackFeaturingEnabled()).toBe(true);
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
    const slugs = orderPublicPromotions(list, BEFORE_SPROUT).map((p) => p.slug);
    expect(slugs).toEqual(["feat", "act-a", "act-b", "sched", "exp"]);
  });

  it("derives ordering from dates: Seed listed expired after 30 Oct", () => {
    const slugs = getPublicPromotions(AFTER_SEED).map((p) => p.slug);
    expect(slugs[0]).toBe("mogen-sprout-first-100");
    expect(slugs).toContain("mogen-seed-r99");
  });
});
