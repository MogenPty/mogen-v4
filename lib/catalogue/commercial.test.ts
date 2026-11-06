import { describe, expect, it } from "vitest";
import {
  applyDiscountCents,
  isPublicWebPrice,
  validPromotionTarget,
  type WebPriceOption,
  type WebPromotionTarget,
} from "./commercial";

const option: WebPriceOption = {
  id: "sprout-managed",
  packageId: "sprout",
  billingMode: "managed_monthly",
  currency: "ZAR",
  amountCents: 39900,
  setupFeeCents: 90000,
  depositPercent: null,
  minimumMonths: 6,
  initialHostingMonths: null,
  hostingResponsibility: "mogen",
  maintenanceResponsibility: "mogen",
  handoverPolicy: "Subject to subscription agreement",
  effectiveFrom: null,
  effectiveUntil: null,
  status: "published",
};
const published = new Set(["sprout"]);
const target: WebPromotionTarget = {
  promotionId: "test-promo",
  packagePriceId: "sprout-managed",
  appliesTo: "recurring",
  discountKind: "percent",
  discountAmountCents: null,
  discountPercentBps: 2500,
  discountedMonths: 3,
};

describe("web pricing publication rules", () => {
  it("requires an approved amount, published package and published option", () => {
    expect(isPublicWebPrice(option, published)).toBe(true);
    expect(isPublicWebPrice({...option, amountCents: null}, published)).toBe(false);
    expect(isPublicWebPrice({...option, status: "draft"}, published)).toBe(false);
    expect(isPublicWebPrice(option, new Set())).toBe(false);
  });
  it("separates managed operations and self-hosted handover", () => {
    expect(isPublicWebPrice({...option, hostingResponsibility: "customer"}, published)).toBe(false);
    expect(isPublicWebPrice({...option, billingMode: "self_hosted", hostingResponsibility: "customer", maintenanceResponsibility: "customer"}, published)).toBe(true);
  });
  it("rejects options outside their effective date range", () => {
    const now = new Date("2026-11-06T12:00:00Z");
    expect(isPublicWebPrice({...option, effectiveFrom: new Date("2026-11-07T00:00:00Z")}, published, now)).toBe(false);
    expect(isPublicWebPrice({...option, effectiveUntil: now}, published, now)).toBe(false);
  });
});

describe("promotion targets", () => {
  it("allows distinct discounts per payment option", () => {
    expect(validPromotionTarget(target, "managed_monthly")).toBe(true);
    expect(validPromotionTarget({...target, appliesTo: "project", discountedMonths: null}, "self_hosted")).toBe(true);
    expect(validPromotionTarget(target, "self_hosted")).toBe(false);
    expect(validPromotionTarget({...target, discountedMonths: 0}, "managed_monthly")).toBe(false);
  });
  it("uses whole cents and basis points for discounts", () => {
    expect(applyDiscountCents(39900, target)).toBe(29925);
    expect(applyDiscountCents(1000, {...target, discountKind: "fixed", discountAmountCents: 2000, discountPercentBps: null})).toBe(0);
    expect(validPromotionTarget({...target, discountPercentBps: 11000}, "managed_monthly")).toBe(false);
  });
});
