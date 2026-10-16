import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import type { Promotion } from "@/data/promotions";
import { getService } from "@/data/services";
import {
  DEFAULT_HERO_LOCATION,
  DEFAULT_HERO_SERVICE_SLUG,
  HERO_LOCATIONS,
  heroMicrocopy,
  resolveHeroServiceSlug,
} from "@/lib/hero";

function readSource(relativePath: string): string {
  return readFileSync(join(process.cwd(), relativePath), "utf8");
}

function makePromotion(overrides: Partial<Promotion> = {}): Promotion {
  return {
    id: "test-promo",
    slug: "test-promo",
    name: "Test Promotion",
    shortDescription: "Test",
    description: "Test promotion",
    status: "active",
    isFeatured: true,
    sortOrder: 1,
    pricing: [],
    eligibility: [],
    terms: [],
    images: [],
    cta: { label: "Claim", href: "/contact" },
    ...overrides,
  };
}

describe("homepage hero — service awareness", () => {
  it("follows the featured promotion's service", () => {
    expect(
      resolveHeroServiceSlug(makePromotion({ relatedService: "seo" })),
    ).toBe("seo");
    expect(
      resolveHeroServiceSlug(
        makePromotion({ relatedService: "digital-marketing" }),
      ),
    ).toBe("digital-marketing");
  });

  it("normalises case and whitespace, rejects unknown services", () => {
    expect(
      resolveHeroServiceSlug(makePromotion({ relatedService: "  SEO " })),
    ).toBe("seo");
    expect(
      resolveHeroServiceSlug(makePromotion({ relatedService: "nonsense" })),
    ).toBe(DEFAULT_HERO_SERVICE_SLUG);
    expect(
      resolveHeroServiceSlug(makePromotion({ relatedService: undefined })),
    ).toBe(DEFAULT_HERO_SERVICE_SLUG);
  });

  it("defaults to Web Development without a promotion", () => {
    expect(resolveHeroServiceSlug(null)).toBe("web-development");
    expect(resolveHeroServiceSlug(undefined)).toBe("web-development");
    expect(DEFAULT_HERO_SERVICE_SLUG).toBe("web-development");
  });

  it("resolves to a real service with a tagline for the hero sub-copy", () => {
    for (const slug of [
      "web-development",
      "seo",
      "digital-marketing",
      "business-documentation",
    ]) {
      const service = getService(resolveHeroServiceSlug(makePromotion({ relatedService: slug })));
      expect(service?.tagline.length).toBeGreaterThan(20);
    }
  });
});

describe("homepage hero — rotating office locations", () => {
  it("covers the three physical offices with Maboloka as the default", () => {
    expect([...HERO_LOCATIONS]).toEqual([
      "Maboloka",
      "Soshanguve",
      "Centurion",
    ]);
    expect(DEFAULT_HERO_LOCATION).toBe("Maboloka");
  });

  it("renders a static default for SSR/no-JS with client-only rotation", () => {
    const hero = readSource("components/mogen/hero.tsx");
    // The visible line falls back to the default when the typewriter
    // has not run yet (SSR, no-JS, crawlers that skip JS).
    expect(hero).toContain("typedLocation || DEFAULT_HERO_LOCATION");
    expect(hero).toContain("HERO_LOCATIONS");
    // The animated word is hidden from assistive tech; the full office
    // list is exposed once via sr-only (same pattern as before).
    expect(hero).toContain('aria-hidden="true"');
    expect(hero).toContain("sr-only");
  });

  it("keeps the H1 service-driven, not a hardcoded service list", () => {
    const hero = readSource("components/mogen/hero.tsx");
    expect(hero).not.toContain("Business Documentation,");
    expect(hero).toContain("service.tagline");
    expect(hero).toContain("service.name");
  });

  it("shares CTA resolution with the header/bar/footer (no bespoke hrefs)", () => {
    const hero = readSource("components/mogen/hero.tsx");
    expect(hero).toContain("useConversionCta");
    expect(hero).not.toContain('href="#assessment"');
    expect(hero).toContain("resolveHeroServiceSlug");
    const home = readSource("app/page.tsx");
    expect(home).toContain("resolveHeroServiceSlug(promotion)");
    expect(home).toContain("<Hero");
    expect(home).toContain("featuredPromotion={promotion}");
  });
});

describe("homepage hero — per-service microcopy", () => {
  it("defines honest microcopy for every service", () => {
    expect(heroMicrocopy("web-development")).toContain("Free assessment");
    expect(heroMicrocopy("seo")).toContain("Free growth audit");
    expect(heroMicrocopy("digital-marketing")).toContain("Free quote");
    expect(heroMicrocopy("business-documentation")).toContain("Free quote");
    expect(heroMicrocopy("unknown")).toContain("Reply in 1 business day");
  });
});

describe("conversion bar — page journey variant", () => {
  it("supports a journey variant alongside the conversion default", () => {
    const bar = readSource("components/mogen/conversation-bar.tsx");
    expect(bar).toContain('variant = "conversion"');
    expect(bar).toContain("Page Journey");
    expect(bar).toContain("Conversion Readiness");
    expect(bar).toContain('href="#top"');
    expect(bar).toContain("Back to top");
    expect(bar).toContain('"Page journey"');
    expect(bar).toContain('"Conversion readiness"');
  });

  it("threads the variant through PageShell with a conversion default", () => {
    const shell = readSource("components/mogen/page-shell.tsx");
    expect(shell).toContain('barVariant = "conversion"');
    expect(shell).toContain("variant={barVariant}");
    // Journey pages need a working back-to-top anchor.
    expect(shell).toContain('id="top"');
  });

  it("uses journey mode on informational pages only", () => {
    expect(readSource("app/about/page.tsx")).toContain(
      'barVariant="journey"',
    );
    expect(readSource("app/privacy-policy/page.tsx")).toContain(
      'barVariant="journey"',
    );
    expect(readSource("app/terms-of-service/page.tsx")).toContain(
      'barVariant="journey"',
    );
    expect(readSource("app/process/page.tsx")).toContain(
      'barVariant="journey"',
    );
    expect(readSource("app/partners/page.tsx")).toContain(
      'barVariant="journey"',
    );
    expect(readSource("app/success-stories/page.tsx")).toContain(
      'barVariant="journey"',
    );
    expect(
      readSource("components/mogen/resources-block.tsx"),
    ).toContain('barVariant="journey"');
    expect(readSource("app/pricing/page.tsx")).toContain(
      'variant="journey"',
    );
  });

  it("keeps conversion mode on demand and discovery pages", () => {
    // No journey opt-in on these routes: homepage, services, promotions,
    // contact, FAQ, articles, locations.
    for (const file of [
      "app/page.tsx",
      "app/services/page.tsx",
      "app/faq/page.tsx",
      "app/locations/page.tsx",
      "app/contact/page.tsx",
    ]) {
      const source = readSource(file);
      expect(source).not.toContain("journey");
    }
  });
});
