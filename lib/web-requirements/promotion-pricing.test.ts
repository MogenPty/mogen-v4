import { describe, expect, it } from "vitest";
import type { Promotion } from "@/data/promotions";
import { contactInputSchema } from "@/lib/contact/contact-service";
import {
  buildWebsiteEnquiryMessage,
  buildWebsiteEnquiryPayload,
  DEFAULT_REQUIREMENTS,
  EMPTY_CONTACT,
} from "./questionnaire";
import { recommendPackage } from "./recommendation";
import {
  findPackagePromotion,
  promotionPriceLines,
  resolveDisplayPromotion,
} from "./promotion-pricing";

function makePromotion(overrides: Partial<Promotion> = {}): Promotion {
  return {
    id: "test-promo",
    slug: "test-promo",
    name: "Test Promotion",
    shortDescription: "Test",
    description: "Test promotion",
    status: "active",
    isFeatured: false,
    sortOrder: 1,
    pricing: [],
    eligibility: [],
    terms: [],
    images: [],
    cta: { label: "Claim", href: "/contact" },
    ...overrides,
  };
}

const seedPromo = makePromotion({
  slug: "mogen-seed-r99",
  name: "Mogen Seed Website",
  relatedService: "web-development",
  relatedPackage: "seed",
  pricing: [
    {
      label: "Mogen Seed Website",
      regular: "R199",
      promotional: "R99",
      cadence: "once-off",
      note: "Regular price R199 — now R99 while the promotion is active.",
    },
  ],
});

const sproutPromo = makePromotion({
  slug: "mogen-sprout-first-100",
  name: "Mogen Sprout Website",
  relatedService: "web-development",
  relatedPackage: "sprout",
  pricing: [
    {
      label: "Setup fee",
      regular: "R1,200",
      promotional: "R900",
      cadence: "once-off",
    },
    {
      label: "Monthly subscription",
      regular: "R399/month",
      promotional: "R299/month",
    },
    {
      label: "Additional pages",
      regular: "R150/month",
      cadence: "per additional 5 pages",
    },
  ],
});

describe("promotion matching", () => {
  it("finds the promotion targeting the recommended package", () => {
    expect(
      findPackagePromotion([seedPromo, sproutPromo], "sprout")?.slug,
    ).toBe("mogen-sprout-first-100");
    expect(findPackagePromotion([seedPromo, sproutPromo], "seed")?.slug).toBe(
      "mogen-seed-r99",
    );
  });

  it("matches case-insensitively and ignores package-less promotions", () => {
    expect(
      findPackagePromotion([sproutPromo, makePromotion()], "SPROUT")?.slug,
    ).toBe("mogen-sprout-first-100");
    expect(
      findPackagePromotion([makePromotion()], "sprout"),
    ).toBeUndefined();
  });

  it("returns undefined without promotions or package", () => {
    expect(findPackagePromotion(undefined, "sprout")).toBeUndefined();
    expect(findPackagePromotion([], "sprout")).toBeUndefined();
    expect(findPackagePromotion([sproutPromo], "")).toBeUndefined();
  });
});

describe("promotion price lines", () => {
  it("shows promotional prices against regular prices", () => {
    expect(promotionPriceLines(seedPromo)).toEqual([
      {
        label: "Mogen Seed Website",
        price: "R99 once-off",
        regular: "R199 once-off",
        note: "Regular price R199 — now R99 while the promotion is active.",
      },
    ]);
  });

  it("keeps non-discounted points at regular prices", () => {
    const lines = promotionPriceLines(sproutPromo);
    expect(lines).toHaveLength(3);
    expect(lines[0]).toMatchObject({
      label: "Setup fee",
      price: "R900 once-off",
      regular: "R1,200 once-off",
    });
    expect(lines[1]).toMatchObject({
      label: "Monthly subscription",
      price: "R299/month",
      regular: "R399/month",
    });
    expect(lines[2].regular).toBeUndefined();
    expect(lines[2].price).toContain("R150/month");
  });
});

describe("display promotion resolution", () => {
  it("applies a matching promotion to managed billing", () => {
    // DEFAULT_REQUIREMENTS recommends Seed on subscription billing.
    const rec = recommendPackage(DEFAULT_REQUIREMENTS);
    expect(rec.billing).toBe("subscription");
    expect(
      resolveDisplayPromotion([seedPromo, sproutPromo], rec)?.slug,
    ).toBe("mogen-seed-r99");
  });

  it("never applies subscription promos to self-hosted once-off builds", () => {
    const onceOff = recommendPackage({
      ...DEFAULT_REQUIREMENTS,
      runPreference: "once-off",
      needs: ["blog"],
    });
    expect(onceOff.packageId).toBe("sprout");
    expect(onceOff.billing).toBe("once-off");
    expect(resolveDisplayPromotion([sproutPromo], onceOff)).toBeUndefined();
  });

  it("applies nothing for consultations or missing promotions", () => {
    const consult = recommendPackage({
      ...DEFAULT_REQUIREMENTS,
      needs: ["custom-app"],
    });
    expect(resolveDisplayPromotion([sproutPromo], consult)).toBeUndefined();
    const rec = recommendPackage(DEFAULT_REQUIREMENTS);
    expect(resolveDisplayPromotion(undefined, rec)).toBeUndefined();
    expect(resolveDisplayPromotion([], rec)).toBeUndefined();
  });
});

describe("promotion enquiry context", () => {
  it("carries the applied promotion name into the enquiry message", () => {
    const rec = recommendPackage(DEFAULT_REQUIREMENTS);
    const withPromo = buildWebsiteEnquiryMessage(
      DEFAULT_REQUIREMENTS,
      rec,
      "Mogen Seed Website",
    );
    expect(withPromo).toContain(
      "Active promotion shown: Mogen Seed Website",
    );
    expect(
      buildWebsiteEnquiryMessage(DEFAULT_REQUIREMENTS, rec),
    ).not.toContain("Active promotion");
  });

  it("keeps promotion-carrying payloads schema-valid", () => {
    const rec = recommendPackage(DEFAULT_REQUIREMENTS);
    const payload = buildWebsiteEnquiryPayload({
      contact: {
        ...EMPTY_CONTACT,
        name: "Lerato M",
        email: "lerato@example.co.za",
      },
      requirements: DEFAULT_REQUIREMENTS,
      recommendation: rec,
      promotionName: findPackagePromotion([seedPromo], "seed")?.name,
    });
    expect(contactInputSchema.safeParse(payload).success).toBe(true);
    expect(payload.message).toContain("Mogen Seed Website");
  });
});
