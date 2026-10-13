import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import type { Promotion } from "@/data/promotions";
import { resolveConversion } from "@/lib/conversion/conversion";

function readSource(relativePath: string): string {
  return readFileSync(join(process.cwd(), relativePath), "utf8");
}

const TODAY = "2026-10-11";

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

function hrefParams(href: string) {
  return new URLSearchParams((href.split("?")[1] ?? "").split("#")[0]);
}

describe("header CTA — shared resolution with the Conversion Bar", () => {
  it("resolves through the shared hook, never a hardcoded destination", () => {
    const nav = readSource("components/mogen/nav.tsx");
    expect(nav).toContain("useConversionCta");
    expect(nav).toContain("cta.href");
    expect(nav).toContain("cta.label");
    expect(nav).toContain("cta.ariaLabel");
    // Desktop and mobile CTAs share the resolved destination.
    expect(nav.split("cta.href").length - 1).toBeGreaterThanOrEqual(2);
    // The old hardcoded audit CTA is gone (the Growth Audit *nav link*
    // remains — only the CTA button went dynamic).
    expect(nav).not.toContain("Free Audit");
    expect(readSource("components/mogen/conversation-bar.tsx")).toContain(
      "useConversionCta",
    );
    expect(
      readSource("lib/conversion/use-conversion-cta.ts"),
    ).toContain("resolveConversion");
  });

  it("forwards identical inputs to header, bar and footer on every page", () => {
    const shell = readSource("components/mogen/page-shell.tsx");
    for (const marker of [
      "<Nav",
      "<ConversionBar",
      "<Footer",
      "serviceSlug={serviceSlug}",
      "featuredPromotion={featuredPromotion}",
    ]) {
      expect(shell).toContain(marker);
    }
    // Homepage: identical promotion + attribution on all three surfaces.
    const home = readSource("app/page.tsx");
    expect(home).toContain("featuredPromotion={promotion}");
    expect(home).toContain("attribution={attribution}");
    // Service pages: the page service wins on all three surfaces.
    expect(readSource("components/mogen/service-detail.tsx")).toContain(
      "serviceSlug={serviceSlug}",
    );
    // Promotion detail: the featured promotion applies on all surfaces.
    const promoDetail = readSource("app/promotions/[slug]/page.tsx");
    expect(promoDetail).toContain("featuredPromotion={featuredPromotion}");
  });

  it("drives the footer CTA from the same resolver (no hardcoded audit link)", () => {
    const footer = readSource("components/mogen/footer.tsx");
    expect(footer).toContain("useConversionCta");
    expect(footer).toContain("cta.href");
    expect(footer).toContain("cta.label");
    expect(footer).toContain("cta.ariaLabel");
    // The old hardcoded footer audit link is gone (the Growth Audit
    // *navigation* link remains — only the CTA went dynamic).
    expect(footer).not.toContain("Get Audit →");
  });

  it("matches the bar on the homepage (Web Development, promotion may override)", () => {
    const plain = resolveConversion({
      defaultServiceSlug: "web-development",
      featuredPromotion: null,
      pathname: "/",
      today: TODAY,
    });
    expect(plain.effectiveServiceSlug).toBe("web-development");
    expect(plain.href).toBe("#assessment");

    const overridden = resolveConversion({
      defaultServiceSlug: "web-development",
      featuredPromotion: makePromotion({
        slug: "web-promo",
        relatedService: "web-development",
      }),
      pathname: "/",
      today: TODAY,
    });
    expect(overridden.overridden).toBe(true);
    // Same-page questionnaire — the promotion selects the service, but
    // discovery never carries promotion context (claims do, to /contact).
    expect(overridden.href).toBe("#assessment");
    expect(overridden.promotionSlug).toBeUndefined();
  });

  it("matches the bar on promotions routes (relevant promotion may override)", () => {
    const cta = resolveConversion({
      defaultServiceSlug: "web-development",
      featuredPromotion: makePromotion({
        slug: "web-promo",
        relatedService: "web-development",
      }),
      pathname: "/promotions",
      today: TODAY,
    });
    expect(cta.effectiveServiceSlug).toBe("web-development");
    expect(cta.href).toBe("/services/web-development#assessment");
    expect(cta.promotionSlug).toBeUndefined();
  });

  it("matches the bar on service pages (page service wins, no unrelated override)", () => {
    const seoPage = resolveConversion({
      serviceSlug: "seo",
      featuredPromotion: makePromotion({
        slug: "web-promo",
        relatedService: "web-development",
      }),
      pathname: "/services/seo",
      today: TODAY,
    });
    expect(seoPage.effectiveServiceSlug).toBe("seo");
    expect(seoPage.href).toBe("#audit");
    expect(seoPage.promotionSlug).toBeUndefined();
  });

  it("matches the bar on other pages (Web Development questionnaire component)", () => {
    const cta = resolveConversion({ today: TODAY });
    expect(cta.effectiveServiceSlug).toBe("web-development");
    expect(cta.href).toBe("/services/web-development#assessment");
    expect(hrefParams(cta.href).has("service")).toBe(false);
  });

  it("handles inactive, expired, non-featured and ineligible promotions consistently", () => {
    const base = {
      defaultServiceSlug: "web-development",
      today: TODAY,
    } as const;
    // Expired and scheduled promotions fall back to the default.
    for (const promo of [
      makePromotion({ status: "expired", relatedService: "seo" }),
      makePromotion({
        status: "active",
        endDate: "2026-10-10",
        relatedService: "seo",
      }),
      makePromotion({
        status: "scheduled",
        startDate: "2026-12-01",
        relatedService: "seo",
      }),
      makePromotion({ isFeatured: false, relatedService: "seo" }),
      makePromotion({ relatedService: "unknown-service" }),
    ]) {
      const cta = resolveConversion({ ...base, featuredPromotion: promo });
      expect(cta.effectiveServiceSlug).toBe("web-development");
      expect(cta.overridden).toBe(false);
    }
  });

  it("forwards attribution identically on all three surfaces", () => {
    // Same-page anchors rely on the page URL (which already feeds the
    // embedded component); cross-page component links carry UTM only.
    const samePage = resolveConversion({
      defaultServiceSlug: "web-development",
      featuredPromotion: makePromotion({
        slug: "web-promo",
        relatedService: "web-development",
      }),
      attribution: { utm_source: "google", utm_campaign: "launch" },
      pathname: "/",
      today: TODAY,
    });
    expect(samePage.href).toBe("#assessment");

    const crossPage = resolveConversion({
      defaultServiceSlug: "web-development",
      featuredPromotion: makePromotion({
        slug: "web-promo",
        relatedService: "web-development",
      }),
      attribution: { utm_source: "google", utm_campaign: "launch" },
      pathname: "/promotions",
      today: TODAY,
    });
    const params = hrefParams(crossPage.href);
    expect(crossPage.href).toBe(
      "/services/web-development?utm_source=google&utm_campaign=launch#assessment",
    );
    expect(params.has("promotion")).toBe(false);
    expect(params.get("utm_source")).toBe("google");
    expect(params.get("utm_campaign")).toBe("launch");
  });
});
