import { describe, expect, it } from "vitest";
import { assessmentEnquiryMessage, INITIAL_ASSESSMENT, recommendAssessmentPackage } from "./assessment";
import type { CatalogueWebPackage } from "./location-offer";

const packages: CatalogueWebPackage[] = ["seed", "sprout", "seedling", "vegetative", "budding", "flowering", "ripening"]
  .map((id, index) => ({
    id, name: id, stage: index + 1, summary: id, description: "",
    websiteIncluded: id !== "seed", maxPages: null, features: [],
    seoScope: [], exclusions: [], status: "published", pricingLabel: "Request a quote",
  }));

describe("website assessment: real seven-package catalogue", () => {
  it("starts with Sprout rather than Seed, which has no website", () => {
    expect(recommendAssessmentPackage(packages, INITIAL_ASSESSMENT)?.id).toBe("sprout");
  });
  it.each([
    ["one", "sprout"], ["small", "seedling"], ["medium", "vegetative"],
    ["large", "budding"], ["extended", "flowering"], ["custom", "ripening"],
  ] as const)("maps size %s to %s", (pageSize, packageId) => {
    expect(recommendAssessmentPackage(packages, { ...INITIAL_ASSESSMENT, pageSize })?.id).toBe(packageId);
  });
  it("requires discovery on bespoke functionality and recommends flowering for bookings", () => {
    expect(recommendAssessmentPackage(packages, { ...INITIAL_ASSESSMENT, needs: ["custom-app"] })?.id).toBe("ripening");
    expect(recommendAssessmentPackage(packages, { ...INITIAL_ASSESSMENT, needs: ["booking"] })?.id).toBe("flowering");
  });
  it("does not recommend draft packages", () => {
    expect(recommendAssessmentPackage(packages.map(p => ({ ...p, status: "draft" })), INITIAL_ASSESSMENT)).toBeUndefined();
  });
  it("preserves lead profile in the message Mogen receives", () => {
    const message = assessmentEnquiryMessage({
      ...INITIAL_ASSESSMENT,
      presence: "needs-work", website: "example.co.za",
      businessType: "retail", goal: "enquiries", pageSize: "small",
      needs: ["whatsapp", "email"], location: "Soshanguve",
      runMode: "managed_monthly",
    }, "Seedling", "R449/month + R999 setup");
    for (const part of ["example.co.za", "retail", "Soshanguve", "whatsapp", "Seedling", "R449/month"]) {
      expect(message).toContain(part);
    }
  });
});
