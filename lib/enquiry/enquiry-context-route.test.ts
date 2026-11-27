import { describe, expect, it, vi } from "vitest";
import { GET } from "@/app/api/enquiry-context/route";

vi.mock("@/lib/catalogue/promotions-server", () => ({
  loadPromotionBySlug: async () => ({
    slug: "launch",
    status: "active",
    source: "database",
    relatedPackage: "sprout",
    relatedService: "web-development",
    targetPriceOptionId: "monthly",
  }),
}));
vi.mock("@/lib/catalogue/server", () => ({
  databaseCatalogueEnabled: () => true,
  loadPublicWebPriceOptions: async () => [
    { id: "monthly", packageId: "sprout", billingMode: "managed_monthly", amountCents: 1000 },
    { id: "annual", packageId: "sprout", billingMode: "managed_annual", amountCents: 10000 },
  ],
}));
vi.mock("@/db/catalogue", () => ({
  getPublishedWebPackage: async (id: string) => ({ id, name: id }),
}));

async function getContext(query: string) {
  return (await GET(new Request(`https://mogen.example/api/enquiry-context?${query}`))).json();
}

describe("enquiry popup context", () => {
  it.each(["promotion=launch", "promotion=launch&package=sprout&priceOption=monthly"])(
    "keeps a compatible promotion for %s",
    async (query) => {
      expect(await getContext(query)).toMatchObject({
        context: { type: "promotion", promotion: { slug: "launch" } },
        initialPriceOptionId: "monthly",
      });
    },
  );

  it("preserves an explicit payment option outside the promotion", async () => {
    expect(await getContext("promotion=launch&package=sprout&priceOption=annual")).toMatchObject({
      context: { type: "package", packageId: "sprout" },
      initialPriceOptionId: "annual",
    });
  });

  it("preserves an explicit package outside the promotion", async () => {
    expect(await getContext("promotion=launch&package=seedling")).toMatchObject({
      context: { type: "package", packageId: "seedling" },
    });
  });

  it("preserves the Other service", async () => {
    expect(await getContext("service=other")).toMatchObject({
      context: { type: "service", serviceSlug: "other" },
    });
  });
});
