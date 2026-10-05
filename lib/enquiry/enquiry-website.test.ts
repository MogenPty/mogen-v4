import { describe, expect, it } from "vitest";
import {
  buildAuditEnquiryMessage,
  buildEnquiryHref,
  parseEnquiryContext,
  resolveEnquiryDetails,
} from "./enquiry";

describe("audit website enquiry context", () => {
  it("parses and carries the analysed website", () => {
    const context = parseEnquiryContext(
      new URLSearchParams("service=seo&website=https%3A%2F%2Fexample.co.za"),
    );
    expect(context.service).toBe("seo");
    expect(context.website).toBe("https://example.co.za");
  });

  it("resolves website without touching the promotion message contract", () => {
    const details = resolveEnquiryDetails({
      service: "seo",
      website: "https://example.co.za",
    });
    expect(details.website).toBe("https://example.co.za");
    expect(details.message).toBeUndefined();
    expect(details.service?.slug).toBe("seo");
  });

  it("builds an editable starter message from the website only", () => {
    const message = buildAuditEnquiryMessage("https://example.co.za");
    expect(message).toContain("https://example.co.za");
    expect(buildAuditEnquiryMessage(undefined)).toBeUndefined();
    expect(buildAuditEnquiryMessage("  ")).toBeUndefined();
  });

  it("includes website in the enquiry href", () => {
    const href = buildEnquiryHref({
      service: "seo",
      website: "https://example.co.za",
    });
    expect(href).toContain("service=seo");
    expect(href).toContain("website=");
  });
});
