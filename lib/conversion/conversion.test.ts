import { describe, expect, it } from "vitest";
import { getFeaturedPromotion, type Promotion } from "@/data/promotions";
import { getConversionBarSettings } from "@/data/services";
import {
  buildConversionCta,
  DEFAULT_CONVERSION_SERVICE_SLUG,
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

describe("conversion settings (data-driven)", () => {
  it("defines settings with href for every service", () => {
    for (const slug of [
      "web-development",
      "seo",
      "digital-marketing",
      "business-documentation",
    ]) {
      const settings = getConversionBarSettings(slug);
      expect(settings?.serviceSlug).toBe(slug);
      expect(settings?.label).toBeTruthy();
      expect(settings?.ariaLabel).toBeTruthy();
      expect(["audit", "enquiry"]).toContain(settings?.journey);
      expect(settings?.href).toBeTruthy();
    }
    expect(getConversionBarSettings("seo")?.href).toBe("/#audit");
    expect(getConversionBarSettings("web-development")?.href).toBe(
      "/contact",
    );
    expect(getConversionBarSettings("unknown")).toBeUndefined();
    expect(getConversionBarSettings(null)).toBeUndefined();
  });

  it("derives CTA copy and href base from the service settings", () => {
    const web = resolveConversion({
      serviceSlug: "web-development",
      featuredPromotion: null,
      today: TODAY,
    });
    const webSettings = getConversionBarSettings("web-development")!;
    expect(web.label).toBe(webSettings.label);
    expect(web.ariaLabel).toBe(webSettings.ariaLabel);
    expect(web.href.startsWith("/contact")).toBe(true);

    const seo = resolveConversion({
      serviceSlug: "seo",
      featuredPromotion: null,
      today: TODAY,
    });
    expect(seo.label).toBe(getConversionBarSettings("seo")!.label);
    expect(seo.href).toBe("/#audit");
  });

  it("defaults to Web Development, never an SEO-centric fallback", () => {
    expect(DEFAULT_CONVERSION_SERVICE_SLUG).toBe("web-development");
    const generic = resolveConversion({ today: TODAY });
    expect(generic.effectiveServiceSlug).toBe("web-development");
    expect(generic.kind).toBe("web-enquiry");
    expect(generic.label).toBe(
      getConversionBarSettings("web-development")!.label,
    );
  });
});

describe("conversion selection (service pages win)", () => {
  it("SEO service page keeps its audit CTA even with a featured Web promotion", () => {
    const cta = resolveConversion({
      serviceSlug: "seo",
      featuredPromotion: webPromo(),
      today: TODAY,
    });
    expect(cta.kind).toBe("seo-audit");
    expect(cta.overridden).toBe(false);
    expect(cta.href).toBe("/#audit");
    expect(cta.label).toContain("Audit");
    expect(cta.promotionSlug).toBeUndefined();
  });

  it("Web Development service page never shows the SEO audit CTA", () => {
    const plain = resolveConversion({
      serviceSlug: "web-development",
      featuredPromotion: null,
      today: TODAY,
    });
    expect(plain.kind).toBe("web-enquiry");
    expect(plain.label).not.toContain("Audit");

    // Even a featured SEO promotion cannot force the audit onto the page.
    const withSeoPromo = resolveConversion({
      serviceSlug: "web-development",
      featuredPromotion: seoPromo(),
      today: TODAY,
    });
    expect(withSeoPromo.kind).toBe("web-enquiry");
    expect(withSeoPromo.label).not.toContain("Audit");
    expect(withSeoPromo.href.startsWith("/contact")).toBe(true);
  });

  it("a matching featured promotion contributes its promotion context", () => {
    const cta = resolveConversion({
      serviceSlug: "web-development",
      featuredPromotion: webPromo(),
      attribution: { utm_source: "google" },
      today: TODAY,
    });
    expect(cta.kind).toBe("web-enquiry");
    expect(cta.overridden).toBe(false);
    const params = hrefParams(cta.href);
    // Minimal promotion context: service inferred centrally, never repeated.
    expect(params.get("promotion")).toBe("web-promo");
    expect(params.has("service")).toBe(false);
    expect(params.get("utm_source")).toBe("google");
  });

  it.each([
    ["digital-marketing", "Digital Marketing"],
    ["business-documentation", "Business Documentation"],
  ])("%s uses its own settings", (slug, name) => {
    const cta = resolveConversion({
      serviceSlug: slug,
      featuredPromotion: webPromo(),
      today: TODAY,
    });
    expect(cta.kind).toBe("service-enquiry");
    expect(cta.effectiveServiceSlug).toBe(slug);
    expect(hrefParams(cta.href).get("service")).toBe(slug);
    expect(cta.ariaLabel).toContain(name);
  });

  it("collapses the audit anchor on the homepage without an auditHref prop", () => {
    const home = resolveConversion({
      serviceSlug: "seo",
      featuredPromotion: null,
      pathname: "/",
      today: TODAY,
    });
    expect(home.href).toBe("#audit");

    const elsewhere = resolveConversion({
      serviceSlug: "seo",
      featuredPromotion: null,
      pathname: "/services/seo",
      today: TODAY,
    });
    expect(elsewhere.href).toBe("/#audit");
  });
});

describe("homepage and promotions routes (promotion applies)", () => {
  it("homepage without an active promotion uses Web Development settings", () => {
    const cta = resolveConversion({
      defaultServiceSlug: "web-development",
      featuredPromotion: null,
      pathname: "/",
      today: TODAY,
    });
    expect(cta.kind).toBe("web-enquiry");
    expect(cta.overridden).toBe(false);
    expect(cta.href.startsWith("/contact")).toBe(true);
    expect(hrefParams(cta.href).get("service")).toBe("web-development");
    expect(cta.label).not.toContain("Audit");
  });

  it("homepage uses the featured promotion's service settings when valid", () => {
    const cta = resolveConversion({
      defaultServiceSlug: "web-development",
      featuredPromotion: seoPromo(),
      pathname: "/",
      today: TODAY,
    });
    expect(cta.overridden).toBe(true);
    expect(cta.kind).toBe("seo-audit");
    expect(cta.href).toBe("#audit");
  });

  it("a featured Web promotion on the homepage carries promotion context", () => {
    const cta = resolveConversion({
      defaultServiceSlug: "web-development",
      featuredPromotion: webPromo(),
      attribution: { utm_campaign: "launch" },
      pathname: "/",
      today: TODAY,
    });
    expect(cta.overridden).toBe(true);
    const params = hrefParams(cta.href);
    expect(params.get("promotion")).toBe("web-promo");
    expect(params.get("utm_campaign")).toBe("launch");
  });
});

describe("promotion validity", () => {
  it("expired, inactive, or non-featured promotions do not apply", () => {
    const home = { defaultServiceSlug: "web-development", today: TODAY } as const;
    const staysWebDev = (promotion: Promotion, allowFallback?: boolean) =>
      selectConversion({ ...home, featuredPromotion: promotion, allowFallback })
        .effectiveServiceSlug;
    // Explicitly expired sticks even with featuring.
    expect(
      staysWebDev(
        makePromotion({ status: "expired", relatedService: "seo" }),
      ),
    ).toBe("web-development");
    // Past endDate reads as expired.
    expect(
      staysWebDev(
        makePromotion({
          status: "active",
          endDate: "2026-10-10",
          relatedService: "seo",
        }),
      ),
    ).toBe("web-development");
    // Scheduled (future start) is not active yet.
    expect(
      staysWebDev(
        makePromotion({
          status: "scheduled",
          startDate: "2026-12-01",
          relatedService: "seo",
        }),
      ),
    ).toBe("web-development");
    // Draft / archived never go live.
    for (const status of ["draft", "archived"] as const) {
      expect(
        staysWebDev(makePromotion({ status, relatedService: "seo" })),
      ).toBe("web-development");
    }
    // Active but unfeatured does not apply without fallback featuring.
    const unfeatured = makePromotion({
      isFeatured: false,
      relatedService: "seo",
    });
    expect(staysWebDev(unfeatured, false)).toBe("web-development");
    // …unless the existing fallback-featuring business rule allows it.
    expect(staysWebDev(unfeatured, true)).toBe("seo");
  });

  it("invalid or missing relatedService falls back safely", () => {
    for (const relatedService of [undefined, "", "unknown-service"]) {
      const page = resolveConversion({
        serviceSlug: "seo",
        featuredPromotion: makePromotion({ relatedService }),
        today: TODAY,
      });
      expect(page.overridden).toBe(false);
      expect(page.kind).toBe("seo-audit");

      const home = resolveConversion({
        defaultServiceSlug: "web-development",
        featuredPromotion: makePromotion({ relatedService }),
        today: TODAY,
      });
      expect(home.kind).toBe("web-enquiry");
      expect(hrefParams(home.href).get("service")).toBe("web-development");
    }
  });

  it("an unknown default service falls back to Web Development", () => {
    const cta = resolveConversion({
      defaultServiceSlug: "unknown-service",
      featuredPromotion: null,
      today: TODAY,
    });
    expect(cta.effectiveServiceSlug).toBe("web-development");
    expect(cta.kind).toBe("web-enquiry");
  });
});

describe("context preservation", () => {
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
      serviceSlug: "digital-marketing",
      packageSlug: "nope",
      featuredPromotion: null,
      today: TODAY,
    });
    expect(hrefParams(unknown.href).has("package")).toBe(false);

    // Carried promotions never invent a package mapping.
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

  it("keeps the selection/destination split for Phase 3", () => {
    const selection = selectConversion({
      defaultServiceSlug: "web-development",
      featuredPromotion: null,
      today: TODAY,
    });
    const rebuilt = buildConversionCta({
      selection,
      attribution: { utm_source: "x" },
    });
    expect(rebuilt.kind).toBe("web-enquiry");
    expect(rebuilt.href).toContain("service=web-development");
    expect(rebuilt.href).toContain("utm_source=x");
  });

  it("follows the authoritative featured selector against real data", () => {
    // Sprout is explicitly featured once live (2026-10-15). The homepage
    // surfaces it; the SEO page keeps its own audit CTA.
    const featured = getFeaturedPromotion("2026-10-15", false);
    expect(featured?.slug).toBe("mogen-sprout-first-100");

    const home = resolveConversion({
      defaultServiceSlug: "web-development",
      featuredPromotion: featured,
      pathname: "/",
      today: "2026-10-15",
    });
    expect(home.overridden).toBe(true);
    expect(home.kind).toBe("web-enquiry");
    expect(hrefParams(home.href).get("promotion")).toBe(
      "mogen-sprout-first-100",
    );

    const seoPage = resolveConversion({
      serviceSlug: "seo",
      featuredPromotion: featured,
      today: "2026-10-15",
    });
    expect(seoPage.kind).toBe("seo-audit");
    expect(seoPage.href).toBe("/#audit");
  });
});
