import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { SERVICES } from "@/data/services";
import { CONTACT_SERVICES } from "@/lib/contact/contact-service";
import { FakeMailProvider } from "@/lib/mail/fake-mail-provider";
import { submitContact } from "@/lib/contact/contact-service";
import {
  parseEnquiryContext,
  resolveEnquiryDetails,
  resolveEnquiryService,
} from "./enquiry";

function readSource(relativePath: string): string {
  return readFileSync(join(process.cwd(), relativePath), "utf8");
}

const config = { from: "Mogen <info@mogen.co.za>", to: "info@mogen.co.za" };

/**
 * Phase 1 — service pages use the shared ContactForm.
 *
 * Guards the smallest reusable interface: ServiceDetail passes the resolved
 * service display name (`initialService`) plus carried attribution
 * (`initialAttribution`) into the existing ContactForm. No new submission
 * API, no duplicated validation, no fake-success form.
 */
describe("phase 1 — service pages use the shared contact form", () => {
  it("resolves every service slug to a ContactForm-selectable name (no silent generic default)", () => {
    expect(SERVICES.length).toBeGreaterThan(0);
    for (const service of SERVICES) {
      const resolved = resolveEnquiryService(service.slug);
      expect(resolved?.name).toBe(service.name);
      // ContactForm leaves the selector empty for unknown names — every
      // service-page name must survive that check.
      expect(CONTACT_SERVICES).toContain(service.name);
    }
  });

  it("renders ContactForm with service + attribution context and no ServiceQuoteForm", () => {
    const source = readSource("components/mogen/service-detail.tsx");
    expect(source).toContain(
      'import ContactForm from "@/components/mogen/contact-form"',
    );
    expect(source).not.toContain("ServiceQuoteForm");
    expect(source).not.toContain("service-quote-form");
    // Correct service context: the page's own service, not a generic default.
    expect(source).toContain("initialService={service.name}");
    // UTM context carried from the service page URL into the submission.
    expect(source).toContain("initialAttribution={attribution}");
  });

  it("has no dead or fake-success quote form remaining", () => {
    expect(existsSync(join(process.cwd(), "components/mogen/service-quote-form.tsx"))).toBe(
      false,
    );
  });

  it.each(SERVICES.map((s) => [s.slug, s.name] as const))(
    "submits a %s enquiry with its own service context intact",
    async (_slug, name) => {
      const fake = new FakeMailProvider();
      const result = await submitContact(
        {
          name: "Test User",
          email: "visitor@example.com",
          phone: "",
          businessName: "",
          service: name,
          package: "",
          otherServiceDetail: "",
          message: "We need help with our project, please send a proposal.",
          companyWebsite: "",
          attribution: { utm_source: "google" },
        },
        fake,
        config,
        { submittedAt: "2026-01-01T00:00:00.000Z" },
      );
      expect(result).toEqual({ ok: true });
      expect(fake.sent).toHaveLength(1);
      expect(fake.sent[0].text).toContain(`Service: ${name}`);
      expect(fake.sent[0].text).toContain("Source: google");
    },
  );

  it("keeps real validation on service enquiries (no fake success)", async () => {
    const fake = new FakeMailProvider();
    // Empty service and short messages must still be rejected — the shared
    // ContactForm contract, not the old always-succeed quote form.
    const emptyService = await submitContact(
      {
        name: "Test User",
        email: "visitor@example.com",
        phone: "",
        businessName: "",
        service: "",
        package: "",
        otherServiceDetail: "",
        message: "We need help with our project, please send a proposal.",
        companyWebsite: "",
        attribution: {},
      },
      fake,
      config,
    );
    expect(emptyService.ok).toBe(false);

    const shortMessage = await submitContact(
      {
        name: "Test User",
        email: "visitor@example.com",
        phone: "",
        businessName: "",
        service: "SEO",
        package: "",
        otherServiceDetail: "",
        message: "short",
        companyWebsite: "",
        attribution: {},
      },
      fake,
      config,
    );
    expect(shortMessage.ok).toBe(false);
    expect(fake.sent).toHaveLength(0);
  });

  it("preserves service + attribution context through the shared enquiry helpers", () => {
    const details = resolveEnquiryDetails(
      parseEnquiryContext(
        new URLSearchParams("service=seo&utm_source=google&utm_medium=organic"),
      ),
    );
    expect(details.serviceName).toBe("SEO");
    expect(details.attribution).toEqual({
      utm_source: "google",
      utm_medium: "organic",
    });
  });
});
