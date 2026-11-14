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
  it("treats Managed Annually as the same managed service billed every year", () => {
    const annual = { ...option, id: "sprout-once-off", billingMode: "managed_annual" as const,
      amountCents: 149900, setupFeeCents: 0, minimumMonths: 12 };
    expect(isPublicWebPrice(annual, published)).toBe(true);
    expect(isPublicWebPrice({ ...annual, status: "draft" }, published)).toBe(false);
    expect(isPublicWebPrice({ ...annual, maintenanceResponsibility: "customer" }, published)).toBe(false);
    expect(isPublicWebPrice({ ...annual, hostingResponsibility: "customer" }, published)).toBe(false);
    expect(isPublicWebPrice({ ...annual, billingMode: "once_off" }, published)).toBe(false);
  });
  it("supports the three Sprout payment choices without making drafts public", () => {
    const choices: WebPriceOption[] = [
      { ...option, id: "sprout-managed-monthly", billingMode: "managed_monthly",
        amountCents: 19900, setupFeeCents: 0, minimumMonths: 6 },
      { ...option, id: "sprout-once-off", billingMode: "managed_annual",
        amountCents: 149900, setupFeeCents: 0, minimumMonths: 12 },
      { ...option, id: "sprout-self-hosted", billingMode: "self_hosted",
        amountCents: 179900, setupFeeCents: 0, minimumMonths: null,
        hostingResponsibility: "customer", maintenanceResponsibility: "customer" },
    ];
    for (const choice of choices) {
      expect(isPublicWebPrice({ ...choice, status: "draft" }, published)).toBe(false);
      expect(isPublicWebPrice({ ...choice, status: "published" }, published)).toBe(true);
    }
  });
  it("only offers Once-Off for Seed; future fixes are separately quoted", () => {
    const seed = { ...option, packageId: "seed" };
    const allowed = new Set(["seed"]);
    expect(isPublicWebPrice({ ...seed, billingMode: "managed_monthly" }, allowed)).toBe(false);
    expect(isPublicWebPrice({
      ...seed, billingMode: "self_hosted",
      hostingResponsibility: "customer", maintenanceResponsibility: "customer",
    }, allowed)).toBe(false);
    expect(isPublicWebPrice({ ...seed, billingMode: "once_off" }, allowed)).toBe(false);
    expect(isPublicWebPrice({
      ...seed, billingMode: "once_off",
      hostingResponsibility: "not_applicable",
      maintenanceResponsibility: "not_applicable",
    }, allowed)).toBe(true);
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
    expect(validPromotionTarget(target, "managed_annual")).toBe(true);
    expect(validPromotionTarget({...target, appliesTo: "project", discountedMonths: null}, "managed_annual")).toBe(false);
    expect(validPromotionTarget({...target, discountedMonths: 0}, "managed_monthly")).toBe(false);
  });
  it("uses whole cents and basis points for discounts", () => {
    expect(applyDiscountCents(39900, target)).toBe(29925);
    expect(applyDiscountCents(1000, {...target, discountKind: "fixed", discountAmountCents: 2000, discountPercentBps: null})).toBe(0);
    expect(validPromotionTarget({...target, discountPercentBps: 11000}, "managed_monthly")).toBe(false);
  });
});
