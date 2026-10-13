import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { buildEnquiryHref } from "@/lib/enquiry/enquiry";
import { resolveConversion } from "@/lib/conversion/conversion";

function readSource(relativePath: string): string {
  return readFileSync(join(process.cwd(), relativePath), "utf8");
}

const TODAY = "2026-10-11";

describe("assessment — questionnaire lives on the Web Development page", () => {
  it("embeds the questionnaire in the web-development service detail", () => {
    const detail = readSource("components/mogen/service-detail.tsx");
    expect(detail).toContain("WebsiteQuestionnaire");
    expect(detail).toContain('serviceSlug === "web-development"');
    expect(detail).toContain("initialAttribution={attribution}");
    expect(detail).toContain("promotions={activePromotions}");
    // The audit stays SEO-only — the questionnaire mirrors it, never
    // replaces it.
    expect(detail).toContain('serviceSlug === "seo"');
    expect(detail).toContain("<GrowthAudit");
  });

  it("feeds the service-page questionnaire with active promotions", () => {
    const page = readSource("app/services/[slug]/page.tsx");
    expect(page).toContain("getActivePromotions");
    expect(page).toContain("activePromotions={activePromotions}");
  });

  it("resolves every Web Development discovery CTA to the questionnaire", () => {
    // Homepage embeds the questionnaire: same-page anchor.
    expect(
      resolveConversion({
        defaultServiceSlug: "web-development",
        featuredPromotion: null,
        pathname: "/",
        today: TODAY,
      }).href,
    ).toBe("#assessment");
    // Web Development page embeds it too: same-page anchor.
    expect(
      resolveConversion({
        serviceSlug: "web-development",
        featuredPromotion: null,
        pathname: "/services/web-development",
        today: TODAY,
      }).href,
    ).toBe("#assessment");
    // Everywhere else: the questionnaire on its service page.
    for (const pathname of ["/pricing", "/about", "/faq", undefined]) {
      expect(
        resolveConversion({
          defaultServiceSlug: "web-development",
          featuredPromotion: null,
          pathname,
          today: TODAY,
        }).href,
      ).toBe("/services/web-development#assessment");
    }
  });

  it("keeps the audit on the SEO page and reachable from anywhere", () => {
    expect(
      resolveConversion({
        serviceSlug: "seo",
        featuredPromotion: null,
        pathname: "/services/seo",
        today: TODAY,
      }).href,
    ).toBe("#audit");
    expect(
      resolveConversion({
        defaultServiceSlug: "web-development",
        featuredPromotion: null,
        pathname: "/pricing",
        today: TODAY,
      }).href,
    ).not.toContain("#audit");
  });
});

describe("assessment — decision (Claim) CTAs still reach /contact", () => {
  it("routes promotion claims to /contact with promotion context", () => {
    const cta = readSource("components/mogen/promotion-enquiry-cta.tsx");
    expect(cta).toContain("buildEnquiryHref");
    expect(cta).toContain("promotion: promotion.slug");
    expect(buildEnquiryHref({ promotion: "mogen-sprout-first-100" })).toBe(
      "/contact?promotion=mogen-sprout-first-100",
    );
  });

  it("routes package quote buttons to /contact with package context", () => {
    const pricing = readSource("components/mogen/service-pricing.tsx");
    expect(pricing).toContain("buildEnquiryHref");
    expect(pricing).toContain("package: t.packageId");
    expect(buildEnquiryHref({ package: "sprout" })).toBe(
      "/contact?package=sprout",
    );
  });

  it("submits the questionnaire through the contact pipeline", () => {
    expect(readSource("components/mogen/website-questionnaire.tsx")).toContain(
      'fetch("/api/contact"',
    );
  });
});
