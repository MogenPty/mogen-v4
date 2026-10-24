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
    expect(getConversionBarSettings("seo")?.href).toBe(
      "/services/seo/#audit",
    );
    expect(getConversionBarSettings("web-development")?.href).toBe(
      "/contact",
    );
    expect(getConversionBarSettings("unknown")).toBeUndefined();
    expect(getConversionBarSettings(null)).toBeUndefined();
  });

  it("derives CTA copy from the service settings; destinations target components", () => {
    const web = resolveConversion({
      serviceSlug: "web-development",
      featuredPromotion: null,
      today: TODAY,
    });
    const webSettings = getConversionBarSettings("web-development")!;
    expect(web.label).toBe(webSettings.label);
    expect(web.ariaLabel).toBe(webSettings.ariaLabel);
    // Discovery CTAs target the service's conversion component — never
    // /contact (decision context belongs to the Claim CTAs).
    expect(web.href).toBe("/services/web-development#assessment");

    const seo = resolveConversion({
      serviceSlug: "seo",
      featuredPromotion: null,
      pathname: "/services/seo",
      today: TODAY,
    });
    expect(seo.label).toBe(getConversionBarSettings("seo")!.label);
    expect(seo.href).toBe("#audit");
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
      pathname: "/services/seo",
      today: TODAY,
    });
    expect(cta.kind).toBe("seo-audit");
    expect(cta.overridden).toBe(false);
    expect(cta.href).toBe("#audit");
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

    // Even a featured SEO promotion cannot force the audit onto the page:
    // the page keeps its own questionnaire journey.
    const withSeoPromo = resolveConversion({
      serviceSlug: "web-development",
      featuredPromotion: seoPromo(),
      today: TODAY,
    });
    expect(withSeoPromo.kind).toBe("web-enquiry");
    expect(withSeoPromo.label).not.toContain("Audit");
    expect(withSeoPromo.href).toBe("/services/web-development#assessment");
  });

  it("a matching featured promotion keeps the page journey (no promotion carry)", () => {
    const cta = resolveConversion({
      serviceSlug: "web-development",
      featuredPromotion: webPromo(),
      attribution: { utm_source: "google" },
      today: TODAY,
    });
    expect(cta.kind).toBe("web-enquiry");
    expect(cta.overridden).toBe(false);
    // Discovery CTAs never carry business context — decision ("Claim")
    // CTAs carry promotion context to /contact via buildEnquiryHref.
    expect(cta.promotionSlug).toBeUndefined();
    expect(cta.href).toBe(
      "/services/web-development?utm_source=google#assessment",
    );
    expect(hrefParams(cta.href).has("promotion")).toBe(false);
    expect(hrefParams(cta.href).has("service")).toBe(false);
  });

  it.each([
    ["digital-marketing", "Digital Marketing"],
    ["business-documentation", "Business Documentation"],
  ])("%s uses its own settings and quote-form component", (slug, name) => {
    const cta = resolveConversion({
      serviceSlug: slug,
      featuredPromotion: webPromo(),
      today: TODAY,
    });
    expect(cta.kind).toBe("service-enquiry");
    expect(cta.effectiveServiceSlug).toBe(slug);
    expect(cta.href).toBe(`/services/${slug}#quote`);
    expect(cta.ariaLabel).toContain(name);
  });

  it("collapses component anchors on their own routes", () => {
    const webPage = resolveConversion({
      serviceSlug: "web-development",
      featuredPromotion: null,
      pathname: "/services/web-development",
      today: TODAY,
    });
    expect(webPage.href).toBe("#assessment");

    const dmPage = resolveConversion({
      serviceSlug: "digital-marketing",
      featuredPromotion: null,
      pathname: "/services/digital-marketing",
      today: TODAY,
    });
    expect(dmPage.href).toBe("#quote");
  });

  it("collapses the audit anchor only on the audit's own route", () => {
    const seoPage = resolveConversion({
      serviceSlug: "seo",
      featuredPromotion: null,
      pathname: "/services/seo",
      today: TODAY,
    });
    expect(seoPage.href).toBe("#audit");

    // Cross-route audit hrefs stay absolute so they still navigate to the
    // SEO page (the audit no longer lives on the homepage).
    const home = resolveConversion({
      defaultServiceSlug: "web-development",
      featuredPromotion: seoPromo(),
      pathname: "/",
      today: TODAY,
    });
    expect(home.href).toBe("/services/seo/#audit");

    const elsewhere = resolveConversion({
      serviceSlug: "seo",
      featuredPromotion: null,
      pathname: "/about",
      today: TODAY,
    });
    expect(elsewhere.href).toBe("/services/seo/#audit");
  });
});

describe("homepage and promotions routes (promotion applies)", () => {
  it("homepage without an active promotion leads into the questionnaire", () => {
    const cta = resolveConversion({
      defaultServiceSlug: "web-development",
      featuredPromotion: null,
      pathname: "/",
      today: TODAY,
    });
    expect(cta.kind).toBe("web-enquiry");
    expect(cta.overridden).toBe(false);
    expect(cta.href).toBe("#assessment");
    expect(cta.label).not.toContain("Audit");
  });

  it("non-homepage Web default targets the questionnaire component", () => {
    const cta = resolveConversion({
      defaultServiceSlug: "web-development",
      featuredPromotion: null,
      today: TODAY,
    });
    expect(cta.kind).toBe("web-enquiry");
    expect(cta.href).toBe("/services/web-development#assessment");
    expect(hrefParams(cta.href).has("service")).toBe(false);
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
    // The audit lives on the SEO service page — no same-page collapse.
    expect(cta.href).toBe("/services/seo/#audit");
  });

  it("a featured Web promotion on the homepage stays on the questionnaire", () => {
    const cta = resolveConversion({
      defaultServiceSlug: "web-development",
      featuredPromotion: webPromo(),
      attribution: { utm_campaign: "launch" },
      pathname: "/",
      today: TODAY,
    });
    expect(cta.overridden).toBe(true);
    // Same-page questionnaire — the promotion selects the service, but
    // discovery never carries promotion context (claims do, to /contact).
    expect(cta.href).toBe("#assessment");
    expect(cta.promotionSlug).toBeUndefined();
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
      expect(home.href).toBe("/services/web-development#assessment");
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

describe("attribution without business context", () => {
  it("carries only UTM attribution on cross-page component links", () => {
    const cta = resolveConversion({
      serviceSlug: "web-development",
      featuredPromotion: null,
      attribution: { utm_source: "google", utm_medium: "organic" },
      today: TODAY,
    });
    expect(cta.href).toBe(
      "/services/web-development?utm_source=google&utm_medium=organic#assessment",
    );
    const params = hrefParams(cta.href);
    expect(params.has("service")).toBe(false);
    expect(params.has("package")).toBe(false);
    expect(params.has("promotion")).toBe(false);

    // Same-page anchors rely on the page URL (which already carries any
    // attribution into the embedded component's submission).
    const samePage = resolveConversion({
      serviceSlug: "web-development",
      featuredPromotion: null,
      attribution: { utm_source: "google" },
      pathname: "/services/web-development",
      today: TODAY,
    });
    expect(samePage.href).toBe("#assessment");
  });

  it("never invents a package mapping for carried promotions", () => {
    const promo = resolveConversion({
      serviceSlug: "digital-marketing",
      featuredPromotion: makePromotion({
        slug: "dm-promo",
        relatedService: "digital-marketing",
      }),
      attribution: { utm_campaign: "launch" },
      today: TODAY,
    });
    expect(promo.promotionSlug).toBeUndefined();
    expect(promo.href).toBe(
      "/services/digital-marketing?utm_campaign=launch#quote",
    );
    expect(hrefParams(promo.href).has("package")).toBe(false);
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
    expect(rebuilt.href).toContain("utm_source=x");
    expect(rebuilt.href).toContain("/services/web-development");
    expect(rebuilt.href).toContain("#assessment");
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
    // Discovery stays on the homepage questionnaire — the promotion
    // selects the service; claiming it happens via the promotion cards
    // (decision CTAs to /contact), never via the chrome CTA.
    expect(home.href).toBe("#assessment");
    expect(home.promotionSlug).toBeUndefined();

    const seoPage = resolveConversion({
      serviceSlug: "seo",
      featuredPromotion: featured,
      pathname: "/services/seo",
      today: "2026-10-15",
    });
    expect(seoPage.kind).toBe("seo-audit");
    expect(seoPage.href).toBe("#audit");
  });
});
