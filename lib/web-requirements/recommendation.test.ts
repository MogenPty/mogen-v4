import { describe, expect, it } from "vitest";
import { getService } from "@/data/services";
import {
  MANAGED_PRICING,
  ONCE_OFF_PRICING,
  recommendPackage,
  recommendationPriceDisplay,
  type WebsiteRequirements,
} from "./recommendation";

const BASE: WebsiteRequirements = {
  goal: "enquiries",
  pageSize: "starter",
  needs: [],
  runPreference: "once-off",
  presence: "none",
  website: "",
  businessType: "services",
  otherBusinessType: "",
  location: "pretoria",
};

describe("website-requirements recommendation", () => {
  it("recommends Seed for a simple starter presence", () => {
    const rec = recommendPackage(BASE);
    expect(rec.packageId).toBe("seed");
    expect(rec.needsConsultation).toBe(false);
    expect(rec.reasons.length).toBeGreaterThan(0);
    expect(rec.reasons.join(" ")).toContain("Seed");
  });

  it("recommends Sprout when managed running is wanted", () => {
    const rec = recommendPackage({ ...BASE, runPreference: "managed" });
    expect(rec.packageId).toBe("sprout");
    expect(rec.reasons.join(" ")).toContain("Sprout");
  });

  it("recommends Sprout when email accounts are needed", () => {
    const rec = recommendPackage({ ...BASE, needs: ["email"] });
    expect(rec.packageId).toBe("sprout");
    expect(rec.reasons.join(" ")).toMatch(/email/i);
  });

  it("mentions managed running only for managed preferences", () => {
    const managed = recommendPackage({ ...BASE, runPreference: "managed" });
    expect(managed.reasons.join(" ")).toMatch(/managed running/);
    // Self-hosted visitors must never see the managed-running reason,
    // even when email needs route them to Sprout.
    const onceOffEmail = recommendPackage({
      ...BASE,
      runPreference: "once-off",
      needs: ["email"],
    });
    expect(onceOffEmail.packageId).toBe("sprout");
    expect(onceOffEmail.reasons.join(" ")).not.toMatch(/managed running/);
  });

  it("recommends Vegetative for e-commerce", () => {
    const rec = recommendPackage({ ...BASE, needs: ["ecommerce"] });
    expect(rec.packageId).toBe("vegetative");
    expect(rec.reasons.join(" ")).toMatch(/e-commerce \/ booking/);
  });

  it("recommends Vegetative for online bookings", () => {
    const rec = recommendPackage({
      ...BASE,
      goal: "bookings",
      needs: ["booking"],
    });
    expect(rec.packageId).toBe("vegetative");
  });

  it("recommends Vegetative for large page counts", () => {
    const rec = recommendPackage({ ...BASE, pageSize: "large" });
    expect(rec.packageId).toBe("vegetative");
    expect(rec.reasons.join(" ")).toMatch(/unlimited pages/);
  });

  it("prefers Vegetative over Sprout when both complexity and managed running apply", () => {
    const rec = recommendPackage({
      ...BASE,
      needs: ["ecommerce", "email"],
      runPreference: "managed",
    });
    expect(rec.packageId).toBe("vegetative");
  });

  it("requests a consultation for requirements outside documented scope", () => {
    const rec = recommendPackage({ ...BASE, needs: ["custom-app"] });
    expect(rec.packageId).toBeNull();
    expect(rec.needsConsultation).toBe(true);
    expect(rec.reasons.join(" ")).toMatch(/consultation/i);
  });

  it("nudges a review when the sales goal lacks selling functionality", () => {
    const rec = recommendPackage({ ...BASE, goal: "sales" });
    expect(rec.packageId).toBe("seed");
    expect(rec.reviewNote).toMatch(/selling online/i);
  });

  it("does not nudge when selling functionality is selected", () => {
    const rec = recommendPackage({
      ...BASE,
      goal: "sales",
      needs: ["ecommerce"],
    });
    expect(rec.reviewNote).toBeUndefined();
  });

  it("grounds reasons in documented package names only", () => {
    const recs = [
      recommendPackage(BASE),
      recommendPackage({ ...BASE, runPreference: "managed" }),
      recommendPackage({ ...BASE, needs: ["ecommerce"] }),
    ];
    for (const rec of recs) {
      expect(rec.reasons.join(" ")).toMatch(/Seed|Sprout|Vegetative/);
    }
  });

  it("does not escalate on page-size uncertainty alone", () => {
    // "Not sure" pages with no database needs stays Seed — only
    // documented scope (selling/bookings, blog/self-editing, 16+ pages)
    // escalates, never the feature count.
    for (const needs of [["whatsapp"], []] as const) {
      const rec = recommendPackage({
        ...BASE,
        pageSize: "unsure",
        needs: [...needs],
      });
      expect(rec.packageId).toBe("seed");
    }
    const email = recommendPackage({
      ...BASE,
      pageSize: "unsure",
      needs: ["email"],
    });
    expect(email.packageId).toBe("sprout");
  });

  it("recommends Sprout for blog or self-editing (database-driven)", () => {
    for (const needs of [["blog"], ["cms"], ["blog", "cms"]] as const) {
      const rec = recommendPackage({ ...BASE, needs: [...needs] });
      expect(rec.packageId).toBe("sprout");
      expect(rec.reasons.join(" ")).toMatch(/database-driven/i);
    }
  });

  it("keeps Vegetative for selling/bookings at any page size", () => {
    for (const pageSize of ["starter", "growing", "large", "unsure"] as const) {
      expect(
        recommendPackage({ ...BASE, pageSize, needs: ["ecommerce"] })
          .packageId,
      ).toBe("vegetative");
      expect(
        recommendPackage({ ...BASE, pageSize, needs: ["booking"] }).packageId,
      ).toBe("vegetative");
    }
  });
});

describe("managed billing", () => {
  it("uses the owner-confirmed managed figures exactly", () => {
    expect(MANAGED_PRICING.seed).toEqual({
      price: "R199",
      cadence: "once-off",
    });
    expect(MANAGED_PRICING.sprout).toEqual({
      price: "R1,200 setup + R399/pm",
      cadence: "",
    });
    expect(MANAGED_PRICING.vegetative).toEqual({
      price: "R2,000 setup + R1,500/pm",
      cadence: "",
    });
  });

  it("keeps managed display consistent with documented pricing", () => {
    const pricing = getService("web-development")?.pricing ?? [];
    const byId = (id: string) => pricing.find((p) => p.packageId === id);
    // Seed matches the documented price exactly.
    expect(MANAGED_PRICING.seed.price).toBe(byId("seed")?.price);
    // Sprout/Vegetative carry the documented monthly prices plus the
    // documented setup fees (listed in the package feature text).
    const allText = pricing
      .flatMap((p) => [p.price, p.cadence, ...p.features])
      .join(" ");
    for (const figure of ["R399", "R1,200", "R1,500", "R2,000"]) {
      expect(allText).toContain(figure);
      expect(
        MANAGED_PRICING.sprout.price + MANAGED_PRICING.vegetative.price,
      ).toContain(figure);
    }
  });
});

describe("once-off billing", () => {
  it("uses the owner-confirmed once-off figures exactly", () => {
    expect(ONCE_OFF_PRICING.seed).toEqual({
      price: "R499",
      cadence: "once-off",
    });
    expect(ONCE_OFF_PRICING.sprout).toEqual({
      price: "from R3,999",
      cadence: "once-off",
    });
    expect(ONCE_OFF_PRICING.vegetative).toEqual({
      price: "from R8,999",
      cadence: "once-off",
    });
  });

  it("bills self-hosted builds once-off without changing the package", () => {
    const seed = recommendPackage({ ...BASE, runPreference: "once-off" });
    expect(seed.packageId).toBe("seed");
    expect(seed.billing).toBe("once-off");

    const sprout = recommendPackage({
      ...BASE,
      runPreference: "once-off",
      needs: ["blog"],
    });
    expect(sprout.packageId).toBe("sprout");
    expect(sprout.billing).toBe("once-off");

    const vegetative = recommendPackage({
      ...BASE,
      runPreference: "once-off",
      needs: ["ecommerce"],
    });
    expect(vegetative.packageId).toBe("vegetative");
    expect(vegetative.billing).toBe("once-off");
  });

  it("explains the once-off price mode in the reasons", () => {
    const rec = recommendPackage({ ...BASE, runPreference: "once-off" });
    expect(rec.reasons.join(" ")).toMatch(/once-off build/i);
  });

  it("bills managed and unsure preferences as subscription", () => {
    expect(
      recommendPackage({ ...BASE, runPreference: "managed" }).billing,
    ).toBe("subscription");
    const unsure = recommendPackage({
      ...BASE,
      runPreference: "unsure",
      pageSize: "unsure",
    });
    expect(unsure.billing).toBe("subscription");
    expect(unsure.reasons.join(" ")).toMatch(/once-off builds are also available/i);
  });

  it("carries no billing for consultations", () => {
    const rec = recommendPackage({ ...BASE, needs: ["custom-app"] });
    expect(rec.billing).toBeNull();
    expect(recommendationPriceDisplay(rec)).toBeNull();
  });

  it("resolves display prices per billing mode", () => {
    expect(
      recommendationPriceDisplay(
        recommendPackage({ ...BASE, runPreference: "once-off" }),
      ),
    ).toEqual({ price: "R499", cadence: "once-off" });
    expect(
      recommendationPriceDisplay(
        recommendPackage({
          ...BASE,
          runPreference: "once-off",
          needs: ["blog"],
        }),
      ),
    ).toEqual({ price: "from R3,999", cadence: "once-off" });
    expect(
      recommendationPriceDisplay(
        recommendPackage({
          ...BASE,
          runPreference: "once-off",
          needs: ["ecommerce"],
        }),
      ),
    ).toEqual({ price: "from R8,999", cadence: "once-off" });
    // Managed display carries setup + subscription per the price list.
    expect(
      recommendationPriceDisplay(
        recommendPackage({ ...BASE, runPreference: "managed" }),
      ),
    ).toEqual({ price: "R1,200 setup + R399/pm", cadence: "" });
  });
});
