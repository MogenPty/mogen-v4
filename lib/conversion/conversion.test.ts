import { describe, expect, it } from "vitest";
import { getFeaturedPromotion, type Promotion } from "@/data/promotions";
import {
  buildConversionCta,
  resolveConversion,
  selectConversion,
} from "./conversion";

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

const seoPromo = (slug = "seo-promo") =>
  makePromotion({ slug, relatedService: "seo" });
const webPromo = (slug = "web-promo") =>
  makePromotion({ slug, relatedService: "web-development" });

function hrefParams(href: string) {
  const query = href.split("?")[1] ?? "";
  return new URLSearchParams(query);
}

describe("conversion selection (Phase 2)", () => {
  it("homepage without an active promotion selects the Web Development journey", () => {
    const cta = resolveConversion({
      serviceSlug: "web-development",
      featuredPromotion: null,
      auditHref: "#audit",
      today: TODAY,
    });
    expect(cta.kind).toBe("web-enquiry");
    expect(cta.overridden).toBe(false);
    expect(cta.href.startsWith("/contact")).toBe(true);
    expect(hrefParams(cta.href).get("service")).toBe("web-development");
    expect(cta.label).not.toContain("Audit");
    expect(cta.href).not.toContain("#audit");
  });

  it("SEO service page selects the SEO audit", () => {
    const cta = resolveConversion({
      serviceSlug: "seo",
      featuredPromotion: null,
      today: TODAY,
    });
    expect(cta.kind).toBe("seo-audit");
    expect(cta.href).toBe("/#audit");
    expect(cta.label).toContain("Audit");
  });

  it("Web Development service page does not select the SEO audit", () => {
    const cta = resolveConversion({
      serviceSlug: "web-development",
      featuredPromotion: null,
      today: TODAY,
    });
    expect(cta.kind).toBe("web-enquiry");
    expect(cta.kind).not.toBe("seo-audit");
    expect(cta.label).not.toContain("Audit");
    expect(cta.href.startsWith("/contact")).toBe(true);
  });

  it.each([
    ["digital-marketing", "Digital Marketing"],
    ["business-documentation", "Business Documentation"],
  ])("%s selects its enquiry journey", (slug, name) => {
    const cta = resolveConversion({
      serviceSlug: slug,
      featuredPromotion: null,
      today: TODAY,
    });
    expect(cta.kind).toBe("service-enquiry");
    expect(cta.effectiveServiceSlug).toBe(slug);
    expect(hrefParams(cta.href).get("service")).toBe(slug);
    expect(cta.href.startsWith("/contact")).toBe(true);
    expect(cta.ariaLabel).toContain(name);
  });

  it("a valid active featured SEO promotion overrides the homepage Web Development journey", () => {
    const cta = resolveConversion({
      serviceSlug: "web-development",
      featuredPromotion: seoPromo(),
      auditHref: "#audit",
      today: TODAY,
    });
    expect(cta.overridden).toBe(true);
    expect(cta.kind).toBe("seo-audit");
    expect(cta.href).toBe("#audit");
    expect(cta.overridingPromotionSlug).toBe("seo-promo");
  });

  it("a valid active featured Web Development promotion overrides an SEO page", () => {
    const cta = resolveConversion({
      serviceSlug: "seo",
      featuredPromotion: webPromo(),
      attribution: { utm_source: "google" },
      today: TODAY,
    });
    expect(cta.overridden).toBe(true);
    expect(cta.kind).toBe("web-enquiry");
    const params = hrefParams(cta.href);
    // Minimal promotion context: service inferred centrally, never repeated.
    expect(params.get("promotion")).toBe("web-promo");
    expect(params.has("service")).toBe(false);
    expect(params.get("utm_source")).toBe("google");
  });

  it("expired, inactive, or non-featured promotions do not override", () => {
    const base = { serviceSlug: "web-development", today: TODAY } as const;
    // Explicitly expired sticks even with featuring.
    expect(
      selectConversion({
        ...base,
        featuredPromotion: makePromotion({
          status: "expired",
          relatedService: "seo",
        }),
      }).overridden,
    ).toBe(false);
    // Past endDate reads as expired.
    expect(
      selectConversion({
        ...base,
        featuredPromotion: makePromotion({
          status: "active",
          endDate: "2026-10-10",
          relatedService: "seo",
        }),
      }).overridden,
    ).toBe(false);
    // Scheduled (future start) is not active yet.
    expect(
      selectConversion({
        ...base,
        featuredPromotion: makePromotion({
          status: "scheduled",
          startDate: "2026-12-01",
          relatedService: "seo",
        }),
      }).overridden,
    ).toBe(false);
    // Draft / archived never go live.
    for (const status of ["draft", "archived"] as const) {
      expect(
        selectConversion({
          ...base,
          featuredPromotion: makePromotion({
            status,
            relatedService: "seo",
          }),
        }).overridden,
      ).toBe(false);
    }
    // Active but unfeatured does not override without fallback featuring.
    const unfeatured = makePromotion({
      isFeatured: false,
      relatedService: "seo",
    });
    expect(
      selectConversion({
        ...base,
        featuredPromotion: unfeatured,
        allowFallback: false,
      }).overridden,
    ).toBe(false);
    // …unless the existing fallback-featuring business rule allows it.
    expect(
      selectConversion({
        ...base,
        featuredPromotion: unfeatured,
        allowFallback: true,
      }).overridden,
    ).toBe(true);
  });

  it("invalid or missing relatedService falls back safely", () => {
    for (const relatedService of [undefined, "", "unknown-service"]) {
      const cta = resolveConversion({
        serviceSlug: "seo",
        featuredPromotion: makePromotion({ relatedService }),
        today: TODAY,
      });
      expect(cta.overridden).toBe(false);
      expect(cta.kind).toBe("seo-audit");
      expect(cta.href).toBe("/#audit");
    }
  });

  it("preserves service, package, and promotion context where applicable", () => {
    // Valid package for the journey's service is preserved.
    const withPackage = resolveConversion({
      serviceSlug: "web-development",
      packageSlug: "sprout",
      featuredPromotion: null,
      attribution: { utm_source: "google", utm_medium: "organic" },
      today: TODAY,
    });
    const pkgParams = hrefParams(withPackage.href);
    expect(pkgParams.get("service")).toBe("web-development");
    expect(pkgParams.get("package")).toBe("sprout");
    expect(pkgParams.get("utm_source")).toBe("google");
    expect(pkgParams.get("utm_medium")).toBe("organic");

    // A package belonging to another service is dropped, never mismatched.
    const mismatched = resolveConversion({
      serviceSlug: "digital-marketing",
      packageSlug: "sprout",
      featuredPromotion: null,
      today: TODAY,
    });
    expect(hrefParams(mismatched.href).get("service")).toBe(
      "digital-marketing",
    );
    expect(hrefParams(mismatched.href).has("package")).toBe(false);

    // Unknown packages are dropped.
    const unknown = resolveConversion({
      serviceSlug: "seo",
      packageSlug: "nope",
      featuredPromotion: null,
      today: TODAY,
    });
    expect(hrefParams(unknown.href).has("package")).toBe(false);

    // Promotion overrides carry the promotion slug (package inferred
    // centrally — never invented here).
    const promo = resolveConversion({
      serviceSlug: "digital-marketing",
      featuredPromotion: makePromotion({
        slug: "dm-promo",
        relatedService: "digital-marketing",
      }),
      attribution: { utm_campaign: "launch" },
      today: TODAY,
    });
    const promoParams = hrefParams(promo.href);
    expect(promoParams.get("promotion")).toBe("dm-promo");
    expect(promoParams.has("package")).toBe(false);
    expect(promoParams.get("utm_campaign")).toBe("launch");
  });

  it("keeps existing defaults and audit destinations intact", () => {
    const generic = resolveConversion({ today: TODAY });
    expect(generic.kind).toBe("default-audit");
    expect(generic.href).toBe("/#audit");
    expect(generic.label).toContain("Audit");

    const customAudit = resolveConversion({
      serviceSlug: "seo",
      featuredPromotion: null,
      auditHref: "#audit",
      today: TODAY,
    });
    expect(customAudit.href).toBe("#audit");

    // Selection rules and destinations stay decoupled for Phase 3.
    const selection = selectConversion({
      serviceSlug: "web-development",
      featuredPromotion: null,
      today: TODAY,
    });
    const rebuilt = buildConversionCta({
      selection,
      auditHref: "/#audit",
      attribution: { utm_source: "x" },
    });
    expect(rebuilt.kind).toBe("web-enquiry");
    expect(rebuilt.href).toContain("service=web-development");
    expect(rebuilt.href).toContain("utm_source=x");
  });

  it("follows the authoritative featured selector against real data", () => {
    // Sprout is explicitly featured once live (2026-10-15) and belongs to
    // Web Development, so it overrides an SEO page default.
    const featured = getFeaturedPromotion("2026-10-15", false);
    expect(featured?.slug).toBe("mogen-sprout-first-100");
    const cta = resolveConversion({
      serviceSlug: "seo",
      featuredPromotion: featured,
      today: "2026-10-15",
    });
    expect(cta.overridden).toBe(true);
    expect(cta.kind).toBe("web-enquiry");
    expect(hrefParams(cta.href).get("promotion")).toBe(
      "mogen-sprout-first-100",
    );
  });
});
