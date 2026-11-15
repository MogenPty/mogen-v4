import { describe, expect, it } from "vitest";
import { projectPromotion, type CampaignRow, type CampaignTarget } from "./promotion-projection";
import type { WebPriceOption } from "./commercial";

const now = new Date("2026-11-11T12:00:00.000Z");
const campaign: CampaignRow = {
  id: "campaign-one", slug: "sprout-intro", name: "Sprout Introduction",
  description: "Discount for eligible Sprout customers", status: "active",
  startsAt: new Date("2026-11-01T00:00:00.000Z"), endsAt: new Date("2026-12-01T00:00:00.000Z"),
  locationSlug: null, eligibility: "New customers", maximumCustomers: null,
  isFeatured: true, sortOrder: 1,
  presentation: { shortDescription: "Save on Sprout", terms: ["Subject to written agreement"], ctaLabel: "Ask about Sprout" },
};
const price: WebPriceOption = {
  id: "sprout-managed-monthly", packageId: "sprout", billingMode: "managed_monthly",
  status: "published", currency: "ZAR", amountCents: 19900, setupFeeCents: 0,
  depositPercent: null, minimumMonths: 6, initialHostingMonths: null,
  hostingResponsibility: "mogen", maintenanceResponsibility: "mogen",
  handoverPolicy: "Managed by Mogen", effectiveFrom: null, effectiveUntil: null,
};
const discount: CampaignTarget = {
  promotionId: "campaign-one", packagePriceId: "sprout-managed-monthly",
  appliesTo: "recurring", discountKind: "fixed",
  discountAmountCents: 5000, discountPercentBps: null, discountedMonths: 3,
};

describe("Neon promotion presentation safety", () => {
  it("projects only a valid published discounted price and matching campaign", () => {
    const offer = projectPromotion(campaign, [discount], [price], now);
    expect(offer?.status).toBe("active");
    expect(offer?.source).toBe("database");
    expect(offer?.relatedPackage).toBe("sprout");
    expect(offer?.targetPriceOptionId).toBe("sprout-managed-monthly");
    expect(offer?.targetPriceOptionIds).toEqual(["sprout-managed-monthly"]);
    expect(offer?.pricing[0].regular.replace(/\s/g, "")).toBe("R199");
    expect(offer?.pricing[0].promotional?.replace(/\s/g, "")).toBe("R149");
    expect(offer?.pricing[0].discountSummary?.replace(/\s/g, "")).toBe("R50discount");
    expect(offer?.pricing[0].note?.replace(/\s/g, " ")).toBe("R 50 discount applies for 3 monthly billing periods.");
  });
  it("projects setup and recurring discounts across plans in one package promotion", () => {
    const annualPrice: WebPriceOption = {
      ...price,
      id: "sprout-managed-annual",
      billingMode: "managed_annual",
      amountCents: 199000,
      setupFeeCents: 25000,
    };
    const targets: CampaignTarget[] = [
      discount,
      { ...discount, packagePriceId: annualPrice.id, appliesTo: "recurring", discountKind: "percent", discountAmountCents: null, discountPercentBps: 1000, discountedMonths: 1 },
      { ...discount, packagePriceId: annualPrice.id, appliesTo: "setup", discountAmountCents: 5000, discountedMonths: null },
    ];
    const offer = projectPromotion(campaign, targets, [price, annualPrice], now);

    expect(offer?.targetPriceOptionIds).toEqual(["sprout-managed-monthly", "sprout-managed-annual"]);
    expect(offer?.pricing.filter(line => line.priceOptionId === annualPrice.id)).toHaveLength(2);
    expect(offer?.pricing.find(line => line.appliesTo === "setup")?.promotional?.replace(/\s/g, "")).toBe("R200");
    expect(offer?.pricing.find(line => line.priceOptionId === annualPrice.id && line.appliesTo === "recurring")?.note)
      .toBe("10% discount applies for 1 annual billing period.");
    expect(offer?.pricing.find(line => line.appliesTo === "setup")?.note?.replace(/\s/g, " "))
      .toBe("R 50 discount applies.");
  });
  it("describes a self-hosted reduction without a billing period", () => {
    const selfHosted: WebPriceOption = {
      ...price,
      id: "sprout-self-hosted",
      billingMode: "self_hosted",
      amountCents: 179900,
      hostingResponsibility: "customer",
      maintenanceResponsibility: "customer",
    };
    const offer = projectPromotion(campaign, [{
      ...discount,
      packagePriceId: selfHosted.id,
      appliesTo: "project",
      discountAmountCents: 29900,
      discountedMonths: null,
    }], [selfHosted], now);

    expect(offer?.pricing[0].note?.replace(/\s/g, " ")).toBe("R 299 discount applies.");
    expect(offer?.pricing[0].note).not.toContain("billing period");
  });
  it("never shows a draft promotion", () => {
    expect(projectPromotion({ ...campaign, status: "draft" }, [discount], [price], now)).toBeUndefined();
  });
  it("never shows unlinked/unpublished prices", () => {
    expect(projectPromotion(campaign, [discount], [], now)).toBeUndefined();
    expect(projectPromotion(campaign, [discount], [{ ...price, status: "draft" }], now)).toBeUndefined();
  });
  it("rejects a mismatched or zero discount", () => {
    expect(projectPromotion(campaign, [{ ...discount, promotionId: "other" }], [price], now)).toBeUndefined();
    expect(projectPromotion(campaign, [{ ...discount, discountAmountCents: 0 }], [price], now)).toBeUndefined();
  });
  it("rejects a campaign mixing different packages", () => {
    expect(projectPromotion(campaign, [discount, { ...discount, packagePriceId: "budding-managed-monthly" }],
      [price, { ...price, id: "budding-managed-monthly", packageId: "budding" }], now)).toBeUndefined();
  });
  it("respects the campaign schedule", () => {
    expect(projectPromotion({ ...campaign, startsAt: new Date("2026-12-01T00:00:00Z"), endsAt: null }, [discount], [price], now)?.status).toBe("scheduled");
    expect(projectPromotion({ ...campaign, endsAt: new Date("2026-11-10T00:00:00Z") }, [discount], [price], now)?.status).toBe("expired");
  });
  it("preserves and enforces an exact mid-day expiry instant", () => {
    const endsAt = new Date("2026-11-11T12:30:00.000Z");
    const beforeExpiry = projectPromotion({ ...campaign, endsAt }, [discount], [price], new Date("2026-11-11T12:29:59.999Z"));
    const atExpiry = projectPromotion({ ...campaign, endsAt }, [discount], [price], endsAt);

    expect(beforeExpiry?.status).toBe("active");
    expect(beforeExpiry?.endsAt).toBe("2026-11-11T12:30:00.000Z");
    expect(atExpiry?.status).toBe("expired");
  });
});
