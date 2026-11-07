/**
 * Pure public safety gates for web price options and campaign targeting.
 * The DB remains authoritative; this does not publish or mutate rows.
 */
export type BillingMode = "managed_monthly" | "once_off" | "self_hosted";
export type Responsibility = "mogen" | "customer" | "not_applicable";

export interface WebPriceOption {
  id: string;
  packageId: string;
  billingMode: BillingMode;
  status: string;
  currency: string;
  amountCents: number | null;
  setupFeeCents: number | null;
  depositPercent: number | null;
  minimumMonths: number | null;
  initialHostingMonths: number | null;
  hostingResponsibility: Responsibility;
  maintenanceResponsibility: Responsibility;
  handoverPolicy: string;
  effectiveFrom: Date | null;
  effectiveUntil: Date | null;
}

export function isPublicWebPrice(
  option: WebPriceOption,
  publishedPackageIds: ReadonlySet<string>,
  now: Date = new Date(),
): boolean {
  // Seed is a one-time business-presence setup, not a recurring website service.
  if (option.packageId === "seed" && option.billingMode !== "once_off") return false;
  if (!publishedPackageIds.has(option.packageId) ||
      option.status !== "published" || option.currency !== "ZAR" ||
      option.amountCents === null || !Number.isSafeInteger(option.amountCents) ||
      option.amountCents < 0) return false;
  if (option.setupFeeCents !== null &&
      (!Number.isSafeInteger(option.setupFeeCents) || option.setupFeeCents < 0)) return false;
  if (option.depositPercent !== null &&
      (!Number.isInteger(option.depositPercent) || option.depositPercent < 0 || option.depositPercent > 100)) return false;
  if (!option.handoverPolicy.trim()) return false;
  if (option.effectiveFrom && now < option.effectiveFrom) return false;
  if (option.effectiveUntil && now >= option.effectiveUntil) return false;

  switch (option.billingMode) {
    case "managed_monthly":
      return option.hostingResponsibility === "mogen" && option.maintenanceResponsibility === "mogen";
    case "self_hosted":
      return option.hostingResponsibility === "customer" && option.maintenanceResponsibility === "customer";
    case "once_off":
      return option.packageId === "seed"
        ? option.hostingResponsibility === "not_applicable" && option.maintenanceResponsibility === "not_applicable"
        : option.hostingResponsibility === "mogen";
    default:
      return false;
  }
}

export interface WebPromotionTarget {
  promotionId: string;
  packagePriceId: string;
  appliesTo: "recurring" | "setup" | "project";
  discountKind: "fixed" | "percent";
  discountAmountCents: number | null;
  discountPercentBps: number | null;
  discountedMonths: number | null;
}

export function validPromotionTarget(target: WebPromotionTarget, mode: BillingMode): boolean {
  if (target.appliesTo === "recurring" && mode !== "managed_monthly") return false;
  if (target.appliesTo === "project" && mode === "managed_monthly") return false;
  if (target.discountedMonths !== null &&
      (target.appliesTo !== "recurring" || !Number.isInteger(target.discountedMonths) || target.discountedMonths <= 0)) return false;
  if (target.discountKind === "fixed") {
    return target.discountAmountCents !== null &&
      Number.isSafeInteger(target.discountAmountCents) &&
      target.discountAmountCents >= 0 && target.discountPercentBps === null;
  }
  if (target.discountKind === "percent") {
    return target.discountAmountCents === null &&
      target.discountPercentBps !== null &&
      Number.isInteger(target.discountPercentBps) &&
      target.discountPercentBps >= 0 && target.discountPercentBps <= 10000;
  }
  return false;
}

/** Safe presentation-only discount; never changes invoiced prices or eligibility. */
export function applyDiscountCents(amountCents: number, target: WebPromotionTarget): number | null {
  if (!Number.isSafeInteger(amountCents) || amountCents < 0) return null;
  if (!validPromotionTarget(target, target.appliesTo === "recurring" ? "managed_monthly" : "self_hosted")) return null;
  if (target.discountKind === "fixed") {
    return Math.max(0, amountCents - (target.discountAmountCents ?? 0));
  }
  return Math.max(0, amountCents - Math.round((amountCents * (target.discountPercentBps ?? 0)) / 10000));
}
