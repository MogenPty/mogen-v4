import { describe, expect, it } from "vitest";
import { getPromotionBySlug } from "@/data/promotions";
import {
  ATTRIBUTION_KEYS,
  buildEnquiryHref,
  parseEnquiryAttribution,
  parseEnquiryContext,
  resolveEnquiryDetails,
  withAttribution,
} from "./enquiry";

/**
 * Task 06 — preserve campaign attribution through the enquiry journey.
 *
 * Campaign URL → promotion/service page → (internal navigation) →
 * Contact → submission. Attribution (`utm_*`) must survive internal
 * CTAs alongside enquiry context (`service`, `promotion`) using the
 * existing URL/context mechanism — no cookies, storage, or sessions.
 */

const SPROUT_SLUG = "mogen-sprout-first-100";

function paramsOf(href: string): URLSearchParams {
  const query = href.split("?")[1] ?? "";
  return new URLSearchParams(query.split("#")[0]);
}

describe("withAttribution — internal navigation", () => {
  it("appends allowlisted UTMs to a clean internal path", () => {
    const href = withAttribution("/services/web-development", {
      utm_source: "whatsapp",
      utm_medium: "organic_social",
      utm_campaign: "sprout-launch-2026",
      utm_content: "whatsapp-status",
    });
    expect(href.startsWith("/services/web-development?")).toBe(true);
    const params = paramsOf(href);
    expect(params.get("utm_source")).toBe("whatsapp");
    expect(params.get("utm_medium")).toBe("organic_social");
    expect(params.get("utm_campaign")).toBe("sprout-launch-2026");
    expect(params.get("utm_content")).toBe("whatsapp-status");
  });

  it("returns the path unchanged when there is no attribution", () => {
    expect(withAttribution("/services/seo", {})).toBe("/services/seo");
    expect(withAttribution("/services/seo")).toBe("/services/seo");
    expect(withAttribution("/contact", {})).toBe("/contact");
  });

  it("preserves an existing query string and hash on the path", () => {
    const href = withAttribution("/services/seo?ref=nav#pricing", {
      utm_source: "instagram",
    });
    expect(href.startsWith("/services/seo?")).toBe(true);
    expect(href.endsWith("#pricing")).toBe(true);
    const params = paramsOf(href);
    expect(params.get("ref")).toBe("nav");
    expect(params.get("utm_source")).toBe("instagram");
  });

  it("omits empty values and URL-encodes the rest", () => {
    const href = withAttribution("/services/seo", {
      utm_source: "",
      utm_campaign: "a b&c",
    });
    const params = paramsOf(href);
    expect(params.has("utm_source")).toBe(false);
    expect(params.get("utm_campaign")).toBe("a b&c");
    expect(href).toContain("utm_campaign=a+b%26c");
  });

  it("ignores non-allowlisted keys", () => {
    const href = withAttribution("/services/seo", {
      utm_source: "instagram",
      foo: "bar",
      tracking: "something",
    } as unknown as Record<"utm_source", string>);
    const params = paramsOf(href);
    expect(params.get("utm_source")).toBe("instagram");
    expect(params.has("foo")).toBe(false);
    expect(params.has("tracking")).toBe(false);
  });

  it("lets explicit attribution win over stale UTMs on the path", () => {
    const href = withAttribution(
      "/services/seo?utm_source=stale&utm_medium=stale",
      { utm_source: "instagram" },
    );
    const params = paramsOf(href);
    expect(params.get("utm_source")).toBe("instagram");
    // Keys without an explicit value are left untouched, never stripped.
    expect(params.get("utm_medium")).toBe("stale");
  });
});

describe("main campaign journey (promotion CTA)", () => {
  const campaignQuery = {
    utm_source: "whatsapp",
    utm_medium: "organic_social",
    utm_campaign: "sprout-launch-2026",
    utm_content: "whatsapp-status",
  };

  it("carries promotion context + attribution into the Contact URL", () => {
    const sprout = getPromotionBySlug(SPROUT_SLUG)!;
    // Visitor lands on the campaign URL; the page parses attribution.
    const attribution = parseEnquiryAttribution(campaignQuery);
    // Promotion CTA click → Contact.
    const href = buildEnquiryHref({
      service: sprout.relatedService,
      promotion: sprout.slug,
      attribution,
    });
    const params = paramsOf(href);
    expect(href.startsWith("/contact?")).toBe(true);
    expect(params.get("service")).toBe("web-development");
    expect(params.get("promotion")).toBe(SPROUT_SLUG);
    expect(params.get("utm_source")).toBe("whatsapp");
    expect(params.get("utm_medium")).toBe("organic_social");
    expect(params.get("utm_campaign")).toBe("sprout-launch-2026");
    expect(params.get("utm_content")).toBe("whatsapp-status");
  });

  it("resolves the Contact URL to Web Development + Sprout + message", () => {
    const sprout = getPromotionBySlug(SPROUT_SLUG)!;
    const href = buildEnquiryHref({
      service: sprout.relatedService,
      promotion: sprout.slug,
      attribution: parseEnquiryAttribution(campaignQuery),
    });
    const details = resolveEnquiryDetails(
      parseEnquiryContext(paramsOf(href)),
    );
    expect(details.serviceName).toBe("Web Development");
    expect(details.promotion?.name).toBe("Mogen Sprout Website");
    expect(details.message).toContain("Mogen Sprout Website");
    expect(details.attribution).toEqual(campaignQuery);
  });
});

describe("multi-hop journey (promotion → service page → Contact)", () => {
  const campaignQuery = {
    utm_source: "whatsapp",
    utm_medium: "organic_social",
    utm_campaign: "sprout-launch-2026",
    utm_content: "whatsapp-status",
  };

  it("preserves attribution across internal navigation into the service CTA", () => {
    // Promotion detail "View service" navigation keeps attribution.
    const serviceHref = withAttribution(
      "/services/web-development",
      parseEnquiryAttribution(campaignQuery),
    );
    expect(serviceHref.startsWith("/services/web-development?")).toBe(true);

    // Service page parses attribution from its own URL; its CTA forwards it.
    const serviceAttribution = parseEnquiryAttribution(paramsOf(serviceHref));
    const contactHref = buildEnquiryHref({
      service: "web-development",
      attribution: serviceAttribution,
    });
    const params = paramsOf(contactHref);
    expect(params.get("service")).toBe("web-development");
    expect(params.get("utm_source")).toBe("whatsapp");
    expect(params.get("utm_medium")).toBe("organic_social");
    expect(params.get("utm_campaign")).toBe("sprout-launch-2026");
    expect(params.get("utm_content")).toBe("whatsapp-status");
    // Service CTAs never invent promotion context.
    expect(params.has("promotion")).toBe(false);
  });
});

describe("service campaign journey (no promotion invented)", () => {
  it("preserves service context + attribution without a promotion", () => {
    const attribution = parseEnquiryAttribution({
      utm_source: "instagram",
      utm_medium: "organic_social",
      utm_campaign: "sprout-launch-2026",
      utm_content: "profile",
    });
    const href = buildEnquiryHref({ service: "seo", attribution });
    const params = paramsOf(href);
    expect(params.get("service")).toBe("seo");
    expect(params.get("utm_source")).toBe("instagram");
    expect(params.get("utm_medium")).toBe("organic_social");
    expect(params.get("utm_campaign")).toBe("sprout-launch-2026");
    expect(params.get("utm_content")).toBe("profile");
    expect(params.has("promotion")).toBe(false);

    const details = resolveEnquiryDetails(parseEnquiryContext(params));
    expect(details.serviceName).toBe("SEO");
    expect(details.promotion).toBeUndefined();
    expect(details.message).toBeUndefined();
  });
});

describe("direct Contact journey (no attribution required)", () => {
  it("works with a bare /contact URL", () => {
    expect(buildEnquiryHref({})).toBe("/contact");
    const details = resolveEnquiryDetails(parseEnquiryContext({}));
    expect(details.service).toBeUndefined();
    expect(details.promotion).toBeUndefined();
    expect(details.message).toBeUndefined();
    expect(details.attribution).toEqual({});
  });

  it("works with service context but no attribution", () => {
    const href = buildEnquiryHref({ service: "seo" });
    expect(href).toBe("/contact?service=seo");
    const details = resolveEnquiryDetails(parseEnquiryContext(paramsOf(href)));
    expect(details.serviceName).toBe("SEO");
    expect(details.attribution).toEqual({});
  });
});

describe("campaign URL with no promotion (service + UTMs)", () => {
  it("keeps service and all supplied UTM values available", () => {
    const details = resolveEnquiryDetails(
      parseEnquiryContext({
        service: "seo",
        utm_source: "facebook",
        utm_medium: "organic_social",
        utm_campaign: "sprout-launch-2026",
        utm_content: "post",
      }),
    );
    expect(details.serviceName).toBe("SEO");
    expect(details.attribution).toEqual({
      utm_source: "facebook",
      utm_medium: "organic_social",
      utm_campaign: "sprout-launch-2026",
      utm_content: "post",
    });
  });
});

describe("optional UTM fields", () => {
  it("retains all six supported fields", () => {
    const href = buildEnquiryHref({
      service: "seo",
      attribution: {
        utm_source: "google",
        utm_medium: "organic",
        utm_campaign: "test-campaign",
        utm_content: "test-content",
        utm_term: "test-term",
        utm_id: "test-id",
      },
    });
    const params = paramsOf(href);
    for (const key of ATTRIBUTION_KEYS) {
      expect(params.get(key)).not.toBeNull();
    }
    expect(params.get("utm_term")).toBe("test-term");
    expect(params.get("utm_id")).toBe("test-id");
  });
});

describe("partial attribution", () => {
  it("preserves present values without inventing the rest", () => {
    const details = resolveEnquiryDetails(
      parseEnquiryContext({ service: "seo", utm_source: "instagram" }),
    );
    expect(details.serviceName).toBe("SEO");
    expect(details.attribution).toEqual({ utm_source: "instagram" });
    expect(details.attribution.utm_medium).toBeUndefined();
    expect(details.attribution.utm_campaign).toBeUndefined();
  });
});

describe("unrelated query parameters", () => {
  it("are ignored on parse and never forwarded", () => {
    const context = parseEnquiryContext({
      service: "seo",
      utm_source: "instagram",
      foo: "bar",
      tracking: "something",
    } as unknown as Record<string, string>);
    expect(context).toEqual({ service: "seo", utm_source: "instagram" });

    const href = buildEnquiryHref({
      service: "seo",
      existingSearchParams: {
        utm_source: "instagram",
        foo: "bar",
        tracking: "something",
      } as unknown as Record<string, string>,
    });
    const params = paramsOf(href);
    expect(params.get("utm_source")).toBe("instagram");
    expect(params.has("foo")).toBe(false);
    expect(params.has("tracking")).toBe(false);
  });
});

describe("generic Contact links (e.g. expired promotions)", () => {
  it("preserve attribution without inventing service/promotion context", () => {
    const href = buildEnquiryHref({
      attribution: parseEnquiryAttribution({
        utm_source: "whatsapp",
        utm_medium: "organic_social",
        utm_campaign: "sprout-launch-2026",
      }),
    });
    const params = paramsOf(href);
    expect(params.get("utm_source")).toBe("whatsapp");
    expect(params.get("utm_campaign")).toBe("sprout-launch-2026");
    expect(params.has("service")).toBe(false);
    expect(params.has("promotion")).toBe(false);
  });
});
