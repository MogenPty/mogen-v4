import { describe, expect, it } from "vitest";
import { buildEnquiryHref } from "./enquiry";

/**
 * Task 02 — service CTA → Contact service context.
 *
 * Locks the contract every service-page enquiry CTA must satisfy: the
 * shared Task 01 helper (`buildEnquiryHref`, no parallel implementation)
 * routes each public service to `/contact?service=<slug>`, while genuinely
 * generic Contact links stay bare `/contact`.
 */
describe("service CTA enquiry routing (Task 02)", () => {
  it.each([
    ["web-development", "Web Development"],
    ["seo", "SEO"],
    ["digital-marketing", "Digital Marketing"],
    ["business-documentation", "Business Documentation"],
  ])("routes the %s CTA with service=%s", (slug) => {
    const href = buildEnquiryHref({ service: slug });
    const params = new URLSearchParams(href.split("?")[1]);
    expect(href.startsWith("/contact?")).toBe(true);
    expect(params.get("service")).toBe(slug);
    // Service CTAs carry service context only — never promotion context.
    expect(params.has("promotion")).toBe(false);
  });

  it("preserves attribution through service CTAs without extra helpers", () => {
    const href = buildEnquiryHref({
      service: "seo",
      attribution: {
        utm_source: "google",
        utm_medium: "organic",
        utm_campaign: "local-seo",
      },
    });
    const params = new URLSearchParams(href.split("?")[1]);
    expect(params.get("service")).toBe("seo");
    expect(params.get("utm_source")).toBe("google");
    expect(params.get("utm_medium")).toBe("organic");
    expect(params.get("utm_campaign")).toBe("local-seo");
  });

  it("leaves genuinely generic Contact links as bare /contact", () => {
    expect(buildEnquiryHref({})).toBe("/contact");
  });
});
