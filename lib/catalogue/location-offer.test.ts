import { describe, expect, it } from "vitest";
import { projectLocationOffer, type CatalogueWebPackage } from "./location-offer";

const names = ["seed", "sprout", "seedling", "vegetative", "budding", "flowering", "ripening"];
const records: CatalogueWebPackage[] = names.map((id, n) => ({
  id, name: id, stage: n + 1, summary: id, description: "", websiteIncluded: id !== "seed",
  maxPages: null, features: [], seoScope: [], exclusions: [], status: "published", pricingLabel: "Request a quote",
}));
describe("location catalogue projection", () => {
  it("shows Maboloka's featured Sprout plus the other requested slots", () => {
    const result = projectLocationOffer({
      locationSlug: "maboloka", featuredPackageId: "sprout", seedCallout: "Seed available",
      slots: [{ kind: "package", packageId: "sprout" }, { kind: "package", packageId: "seedling" },
        { kind: "package", packageId: "vegetative" }, { kind: "explore", direction: "larger" }],
    }, records);
    expect(result?.featuredPackageId).toBe("sprout");
    expect(result?.slots).toHaveLength(4);
    expect(result?.slots[0]).toMatchObject({ kind: "package", featured: true });
  });
  it("never exposes draft packages or a location offer with no published featured stage", () => {
    const offer = { locationSlug: "centurion", featuredPackageId: "flowering", seedCallout: "Seed", slots: [
      { kind: "explore" as const, direction: "smaller" as const },
      { kind: "package" as const, packageId: "budding" },
      { kind: "package" as const, packageId: "flowering" },
      { kind: "package" as const, packageId: "ripening" }] };
    expect(projectLocationOffer(offer, records.map(p => p.id === "flowering" ? { ...p, status: "draft" } : p))).toBeNull();
    expect(projectLocationOffer(offer, records.map(p => ({ ...p, status: "draft" })))).toBeNull();
  });
  it("rejects repeated and mismatched package slots", () => {
    const offer = { locationSlug: "soshanguve", featuredPackageId: "vegetative", seedCallout: "Seed",
      slots: [{ kind: "package" as const, packageId: "vegetative" }, { kind: "package" as const, packageId: "vegetative" },
        { kind: "package" as const, packageId: "budding" }, { kind: "explore" as const, direction: "larger" as const }] };
    expect(projectLocationOffer(offer, records)).toBeNull();
  });
});
