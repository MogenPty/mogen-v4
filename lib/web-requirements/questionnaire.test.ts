import { describe, expect, it } from "vitest";
import { contactInputSchema } from "@/lib/contact/contact-service";
import { resolveSubmissionPackage } from "@/lib/contact/contact-service";
import { recommendPackage } from "./recommendation";
import type { WebsiteRequirements } from "./recommendation";
import {
  buildWebsiteEnquiryMessage,
  buildWebsiteEnquiryPayload,
  canProceed,
  DEFAULT_REQUIREMENTS,
  EMPTY_CONTACT,
  QUESTIONNAIRE_STEPS,
  validateContact,
  validateWebsiteUrl,
  WEBSITE_ASSESSMENT_ANCHOR,
} from "./questionnaire";

describe("questionnaire steps", () => {
  it("defines five labelled steps ending in a recommendation", () => {
    expect(QUESTIONNAIRE_STEPS).toHaveLength(5);
    expect(QUESTIONNAIRE_STEPS[0].id).toBe("contact");
    expect(QUESTIONNAIRE_STEPS[4].id).toBe("recommendation");
    for (const step of QUESTIONNAIRE_STEPS) {
      expect(step.label).toBeTruthy();
    }
  });

  it("uses a stable assessment anchor", () => {
    expect(WEBSITE_ASSESSMENT_ANCHOR).toBe("assessment");
  });
});

describe("contact gating", () => {
  it("requires contact details before subsequent questions", () => {
    expect(canProceed("contact", EMPTY_CONTACT)).toBe(true);
    expect(canProceed("business", EMPTY_CONTACT)).toBe(false);
    expect(canProceed("needs", EMPTY_CONTACT)).toBe(false);
    expect(canProceed("location", EMPTY_CONTACT)).toBe(false);
    expect(canProceed("recommendation", EMPTY_CONTACT)).toBe(false);
  });

  it("allows progression once name and email validate", () => {
    const contact = {
      ...EMPTY_CONTACT,
      name: "Lerato M",
      email: "lerato@example.co.za",
    };
    expect(canProceed("business", contact)).toBe(true);
    expect(canProceed("recommendation", contact)).toBe(true);
  });

  it("reports accessible field errors for name and email", () => {
    expect(validateContact(EMPTY_CONTACT)).toEqual({
      name: "Please enter your name.",
      email: "Please enter a valid email address.",
    });
    expect(
      validateContact({ ...EMPTY_CONTACT, name: "A", email: "not-an-email" }),
    ).toEqual({
      name: "Please enter your name.",
      email: "Please enter a valid email address.",
    });
    expect(
      validateContact({
        ...EMPTY_CONTACT,
        name: "Lerato M",
        email: "lerato@example.co.za",
      }),
    ).toEqual({});
  });
});

describe("conditional detail fields", () => {
  it("treats an empty website address as valid (optional field)", () => {
    expect(validateWebsiteUrl("")).toBeUndefined();
    expect(validateWebsiteUrl("   ")).toBeUndefined();
  });

  it("accepts bare domains and full URLs", () => {
    expect(validateWebsiteUrl("yourbusiness.co.za")).toBeUndefined();
    expect(validateWebsiteUrl("https://www.example.co.za/shop")).toBeUndefined();
  });

  it("rejects malformed website addresses", () => {
    expect(validateWebsiteUrl("not a site")).toMatch(/valid website/i);
    expect(validateWebsiteUrl("justtext")).toMatch(/valid website/i);
  });

  it("carries the website and other business kind into the message", () => {
    const rec = recommendPackage(DEFAULT_REQUIREMENTS);
    const message = buildWebsiteEnquiryMessage(
      {
        ...DEFAULT_REQUIREMENTS,
        presence: "needs-work",
        website: "moben.co.za",
        businessType: "other",
        otherBusinessType: "Bakery",
      },
      rec,
    );
    expect(message).toContain("moben.co.za");
    expect(message).toContain("Bakery");
    expect(message.length).toBeGreaterThan(10);
  });

  it("includes the billing price in the enquiry message", () => {
    const onceOffReq: WebsiteRequirements = {
      ...DEFAULT_REQUIREMENTS,
      runPreference: "once-off",
      needs: ["blog"],
    };
    const onceOff = recommendPackage(onceOffReq);
    expect(buildWebsiteEnquiryMessage(onceOffReq, onceOff)).toContain(
      "(from R3,999 once-off)",
    );
    const managedReq: WebsiteRequirements = {
      ...DEFAULT_REQUIREMENTS,
      runPreference: "managed",
    };
    const managed = recommendPackage(managedReq);
    expect(buildWebsiteEnquiryMessage(managedReq, managed)).toContain(
      "(R1,200 setup + R399/pm)",
    );
  });

  it("omits empty conditional details from the message", () => {
    const rec = recommendPackage(DEFAULT_REQUIREMENTS);
    const message = buildWebsiteEnquiryMessage(DEFAULT_REQUIREMENTS, rec);
    expect(message).not.toContain("Current site: no website yet (");
    expect(message).not.toContain("other (");
  });

  it("keeps payloads with conditional details schema-valid", () => {
    const rec = recommendPackage(DEFAULT_REQUIREMENTS);
    const payload = buildWebsiteEnquiryPayload({
      contact: {
        ...EMPTY_CONTACT,
        name: "Lerato M",
        email: "lerato@example.co.za",
      },
      requirements: {
        ...DEFAULT_REQUIREMENTS,
        presence: "works-fine",
        website: "https://moben.co.za",
        businessType: "other",
        otherBusinessType: "Bakery",
      },
      recommendation: rec,
    });
    expect(
      contactInputSchema.safeParse(payload).success,
    ).toBe(true);
  });
});

describe("enquiry payload", () => {
  const contact = {
    ...EMPTY_CONTACT,
    name: "Lerato M",
    email: "lerato@example.co.za",
    phone: "012 555 0199",
    businessName: "Lerato Plumbing",
  };

  it("builds a message summarising the stated requirements", () => {
    const rec = recommendPackage(DEFAULT_REQUIREMENTS);
    const message = buildWebsiteEnquiryMessage(DEFAULT_REQUIREMENTS, rec);
    expect(message.length).toBeGreaterThan(10);
    expect(message).toMatch(/Goal:/);
    expect(message).toMatch(/Location:/);
  });

  it("produces a payload that passes the contact schema for each package", () => {
    const cases = [
      recommendPackage(DEFAULT_REQUIREMENTS),
      recommendPackage({ ...DEFAULT_REQUIREMENTS, runPreference: "managed" }),
      recommendPackage({ ...DEFAULT_REQUIREMENTS, needs: ["ecommerce"] }),
      recommendPackage({ ...DEFAULT_REQUIREMENTS, needs: ["custom-app"] }),
    ];
    for (const rec of cases) {
      const payload = buildWebsiteEnquiryPayload({
        contact,
        requirements: DEFAULT_REQUIREMENTS,
        recommendation: rec,
        attribution: { utm_source: "google" },
      });
      const parsed = contactInputSchema.safeParse({
        ...payload,
        turnstileToken: "test-token",
      });
      expect(parsed.success).toBe(true);
    }
  });

  it("preserves attribution through the payload", () => {
    const payload = buildWebsiteEnquiryPayload({
      contact,
      requirements: DEFAULT_REQUIREMENTS,
      recommendation: recommendPackage(DEFAULT_REQUIREMENTS),
      attribution: { utm_source: "google", utm_campaign: "launch" },
    });
    expect(payload.attribution).toEqual({
      utm_source: "google",
      utm_campaign: "launch",
    });
  });

  it("sends consultation cases as service-only context (no forced package)", () => {
    const rec = recommendPackage({ ...DEFAULT_REQUIREMENTS, needs: ["custom-app"] });
    const payload = buildWebsiteEnquiryPayload({
      contact,
      requirements: DEFAULT_REQUIREMENTS,
      recommendation: rec,
    });
    expect(payload.package).toBe("");
    expect(payload.message).toMatch(/consultation/i);
  });

  it("relies on server-side package validation, never client trust", () => {
    // Recommended packages resolve against the registry for the service…
    expect(
      resolveSubmissionPackage({ service: "Web Development", package: "sprout" }),
    ).toBe("sprout");
    // …while unknown or mismatched claims are dropped server-side.
    expect(
      resolveSubmissionPackage({ service: "Web Development", package: "nope" }),
    ).toBe("");
    expect(
      resolveSubmissionPackage({ service: "SEO", package: "sprout" }),
    ).toBe("");
  });
});
