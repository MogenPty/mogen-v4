import { describe, expect, it } from "vitest";
import { recommendCataloguePackage } from "./recommendation";
import type { CatalogueWebPackage } from "./location-offer";

const names = ["seed", "sprout", "seedling", "vegetative", "budding", "flowering", "ripening"];
const data: CatalogueWebPackage[] = names.map((id, index) => ({
  id, name: id, stage: index + 1, summary: id, description: "",
  websiteIncluded: id !== "seed", maxPages: null, features: [],
  seoScope: [], exclusions: [], status: "published", pricingLabel: "Request a quote",
}));

describe("database-backed package recommendation", () => {
  it("never recommends no-website Seed for a website", () => {
    expect(recommendCataloguePackage(data, "first")?.id).toBe("sprout");
  });
  it("recommends growth stages in ascending complexity", () => {
    expect(recommendCataloguePackage(data, "brochure")?.id).toBe("seedling");
    expect(recommendCataloguePackage(data, "growth")?.id).toBe("vegetative");
    expect(recommendCataloguePackage(data, "marketing")?.id).toBe("budding");
    expect(recommendCataloguePackage(data, "booking")?.id).toBe("flowering");
    expect(recommendCataloguePackage(data, "custom")?.id).toBe("ripening");
  });
  it("never recommends a draft package", () => {
    expect(recommendCataloguePackage(data.map(p => ({ ...p, status: "draft" })), "first")).toBeUndefined();
    expect(recommendCataloguePackage(data.filter(p => p.id !== "flowering"), "booking")?.id).toBe("ripening");
  });
});
