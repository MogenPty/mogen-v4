import { describe, expect, it } from "vitest";
import {
  ATTRIBUTION_KEYS,
  buildEnquiryHref,
  buildPromotionEnquiryMessage,
  parseEnquiryAttribution,
  parseEnquiryContext,
  preferExistingMessage,
  resolveEnquiryDetails,
  resolveEnquiryPromotion,
  resolveEnquiryService,
} from "./enquiry";

describe("parseEnquiryContext", () => {
  it("parses service + promotion + attribution from a record", () => {
    expect(
      parseEnquiryContext({
        service: "web-development",
        promotion: "mogen-sprout-first-100",
        utm_source: "whatsapp",
        utm_medium: "organic_social",
        utm_campaign: "sprout-launch-2026",
        utm_content: "whatsapp-status",
      }),
    ).toEqual({
      service: "web-development",
      promotion: "mogen-sprout-first-100",
      utm_source: "whatsapp",
      utm_medium: "organic_social",
      utm_campaign: "sprout-launch-2026",
      utm_content: "whatsapp-status",
    });
  });

  it("parses URLSearchParams input", () => {
    const params = new URLSearchParams(
      "service=seo&utm_source=whatsapp&utm_term=x&utm_id=1",
    );
    expect(parseEnquiryContext(params)).toEqual({
      service: "seo",
      utm_source: "whatsapp",
      utm_term: "x",
      utm_id: "1",
    });
  });

  it("returns an empty context for a direct /contact visit", () => {
    expect(parseEnquiryContext({})).toEqual({});
    expect(parseEnquiryContext(new URLSearchParams())).toEqual({});
  });

  it("drops empty values and ignores unknown keys", () => {
    expect(
      parseEnquiryContext({
        service: "  ",
        promotion: "",
        utm_source: "",
        evil: "1",
      } as unknown as Record<string, string>),
    ).toEqual({});
  });

  it("takes the first value of repeated keys", () => {
    expect(
      parseEnquiryContext({ service: ["seo", "web-development"] }),
    ).toEqual({ service: "seo" });
  });
});

describe("resolveEnquiryService", () => {
  it.each([
    ["web-development", "Web Development"],
    ["seo", "SEO"],
    ["digital-marketing", "Digital Marketing"],
    ["business-documentation", "Business Documentation"],
  ])("resolves service=%s to %s", (slug, name) => {
    expect(resolveEnquiryService(slug)?.name).toBe(name);
  });

  it("returns undefined for invalid, empty or missing slugs without throwing", () => {
    expect(resolveEnquiryService("does-not-exist")).toBeUndefined();
    expect(resolveEnquiryService("")).toBeUndefined();
    expect(resolveEnquiryService("   ")).toBeUndefined();
    expect(resolveEnquiryService(undefined)).toBeUndefined();
  });
});

describe("resolveEnquiryPromotion", () => {
  it("resolves the Sprout promotion by slug", () => {
    const promotion = resolveEnquiryPromotion("mogen-sprout-first-100");
    expect(promotion?.name).toBe("Mogen Sprout Website");
  });

  it("resolves a scheduled promotion (status does not gate context)", () => {
    // Sprout starts 1 Oct 2026 — still resolvable as enquiry context.
    expect(resolveEnquiryPromotion("mogen-sprout-first-100")).toBeDefined();
  });

  it("returns undefined for invalid, empty or missing slugs without throwing", () => {
    expect(resolveEnquiryPromotion("no-such-promo")).toBeUndefined();
    expect(resolveEnquiryPromotion("")).toBeUndefined();
    expect(resolveEnquiryPromotion(undefined)).toBeUndefined();
  });
});

describe("resolveEnquiryDetails", () => {
  it("resolves service + promotion simultaneously", () => {
    const details = resolveEnquiryDetails({
      service: "web-development",
      promotion: "mogen-sprout-first-100",
    });
    expect(details.service?.name).toBe("Web Development");
    expect(details.serviceName).toBe("Web Development");
    expect(details.promotion?.name).toBe("Mogen Sprout Website");
    expect(details.message).toContain("Mogen Sprout Website");
  });

  it("leaves invalid service/promotion unresolved without throwing", () => {
    const details = resolveEnquiryDetails({
      service: "does-not-exist",
      promotion: "no-such-promo",
    });
    expect(details.service).toBeUndefined();
    expect(details.serviceName).toBeUndefined();
    expect(details.promotion).toBeUndefined();
    expect(details.message).toBeUndefined();
  });

  it("produces no message when there is no promotion", () => {
    const details = resolveEnquiryDetails({ service: "seo" });
    expect(details.serviceName).toBe("SEO");
    expect(details.message).toBeUndefined();
  });
});

describe("buildPromotionEnquiryMessage", () => {
  it("creates an editable starter message from promotion data", () => {
    const promotion = resolveEnquiryPromotion("mogen-sprout-first-100")!;
    const message = buildPromotionEnquiryMessage(promotion);
    expect(message).toContain(promotion.name);
    expect(message.length).toBeGreaterThan(0);
  });

  it("never hardcodes pricing and never includes UTM metadata", () => {
    const promotion = resolveEnquiryPromotion("mogen-sprout-first-100")!;
    const message = buildPromotionEnquiryMessage(promotion);
    for (const banned of ["R900", "R299", "R399", "utm_", "whatsapp"]) {
      expect(message).not.toContain(banned);
    }
  });
});

describe("preferExistingMessage", () => {
  it("keeps an already edited message over generated promotion text", () => {
    expect(preferExistingMessage("My custom text", "Generated")).toBe(
      "My custom text",
    );
  });

  it("uses the generated message when the field is still empty", () => {
    expect(preferExistingMessage("", "Generated")).toBe("Generated");
    expect(preferExistingMessage("   ", "Generated")).toBe("Generated");
  });

  it("falls back to empty when there is no generated message", () => {
    expect(preferExistingMessage("", undefined)).toBe("");
  });
});

describe("buildEnquiryHref", () => {
  it("builds a service-only enquiry URL", () => {
    expect(buildEnquiryHref({ service: "seo" })).toBe(
      "/contact?service=seo",
    );
  });

  it("builds a service + promotion + attribution URL", () => {
    const href = buildEnquiryHref({
      service: "web-development",
      promotion: "mogen-sprout-first-100",
      attribution: {
        utm_source: "whatsapp",
        utm_medium: "organic_social",
        utm_campaign: "sprout-launch-2026",
        utm_content: "whatsapp-status",
      },
    });
    const params = new URLSearchParams(href.split("?")[1]);
    expect(href.startsWith("/contact?")).toBe(true);
    expect(params.get("service")).toBe("web-development");
    expect(params.get("promotion")).toBe("mogen-sprout-first-100");
    expect(params.get("utm_source")).toBe("whatsapp");
    expect(params.get("utm_medium")).toBe("organic_social");
    expect(params.get("utm_campaign")).toBe("sprout-launch-2026");
    expect(params.get("utm_content")).toBe("whatsapp-status");
  });

  it("preserves allowlisted attribution from existing search params", () => {
    const existing = new URLSearchParams(
      "utm_source=whatsapp&utm_medium=organic_social&utm_campaign=sprout-launch-2026&utm_content=whatsapp-status",
    );
    const href = buildEnquiryHref({
      service: "web-development",
      promotion: "mogen-sprout-first-100",
      existingSearchParams: existing,
    });
    const params = new URLSearchParams(href.split("?")[1]);
    expect(params.get("service")).toBe("web-development");
    expect(params.get("promotion")).toBe("mogen-sprout-first-100");
    for (const key of ATTRIBUTION_KEYS.slice(0, 4)) {
      expect(params.get(key)).toBe(existing.get(key));
    }
  });

  it("lets explicit values win over existing params and drops the rest", () => {
    const href = buildEnquiryHref({
      service: "seo",
      existingSearchParams: {
        service: "web-development",
        utm_source: "whatsapp",
        evil: "drop-me",
      } as unknown as Record<string, string>,
    });
    const params = new URLSearchParams(href.split("?")[1]);
    expect(params.get("service")).toBe("seo");
    expect(params.get("utm_source")).toBe("whatsapp");
    expect(params.has("evil")).toBe(false);
  });

  it("omits undefined/empty values and URL-encodes the rest", () => {
    expect(
      buildEnquiryHref({
        service: " ",
        promotion: undefined,
        attribution: { utm_source: "", utm_campaign: "a b&c" },
      }),
    ).toBe("/contact?utm_campaign=a+b%26c");
  });

  it("returns bare /contact when there is nothing to carry", () => {
    expect(buildEnquiryHref({})).toBe("/contact");
  });
});

describe("parseEnquiryAttribution", () => {
  it("extracts only allowlisted attribution keys", () => {
    expect(
      parseEnquiryAttribution({
        service: "seo",
        utm_source: "whatsapp",
        utm_medium: "organic_social",
        other: "nope",
      } as unknown as Record<string, string>),
    ).toEqual({ utm_source: "whatsapp", utm_medium: "organic_social" });
  });
});
