import type { Promotion, PromotionFaq, PromotionImage, PromotionStep } from "@/data/promotions";
import { applyDiscountCents, validPromotionTarget, type WebPriceOption, type WebPromotionTarget } from "./commercial";

export interface CampaignRow {
  id: string; slug: string | null; name: string; description: string; status: string;
  startsAt: Date | null; endsAt: Date | null; locationSlug: string | null;
  eligibility: string; maximumCustomers: number | null; isFeatured: boolean;
  sortOrder: number; presentation: unknown;
}
export type CampaignTarget = WebPromotionTarget;
const zar = (cents: number) => new Intl.NumberFormat("en-ZA", {
  style: "currency", currency: "ZAR", maximumFractionDigits: 0,
}).format(cents / 100);
const str = (value: unknown, fallback = "") => typeof value === "string" ? value : fallback;
const strings = (value: unknown): string[] => Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : [];
const rec = (value: unknown): Record<string, unknown> =>
  value !== null && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {};
const date = (value: Date | null): string | undefined => value?.toISOString().slice(0, 10);

/** DB targets are the only source for prices and discounts. No client-authored price claims. */
export function projectPromotion(
  row: CampaignRow,
  targets: readonly CampaignTarget[],
  options: readonly WebPriceOption[],
  now = new Date(),
): Promotion | undefined {
  if (!row.slug || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(row.slug)) return;
  if (row.status === "draft" || row.status === "archived") return;
  const content = rec(row.presentation);
  const selected = targets
    .filter(target => target.promotionId === row.id)
    .flatMap(target => {
      const option = options.find(p => p.id === target.packagePriceId);
      if (!option || option.amountCents === null || option.currency !== "ZAR" ||
          !validPromotionTarget(target, option.billingMode)) return [];
      const base = target.appliesTo === "setup" ? option.setupFeeCents : option.amountCents;
      if (base === null) return [];
      const amount = applyDiscountCents(base, target);
      if (amount === null || amount === base) return [];
      return [{ target, option, base, amount }];
    });
  if (!selected.length) return; // No current validated, discounted price; do not advertise.
  const packageIds = new Set(selected.map(item => item.option.packageId));
  if (packageIds.size !== 1) return; // A simple public CTA must resolve one package.
  const packageId = selected[0].option.packageId;
  const primary = selected[0];
  const status = row.status === "expired" ? "expired" :
    row.endsAt && now >= row.endsAt ? "expired" :
    row.startsAt && now < row.startsAt ? "scheduled" :
    row.status === "scheduled" && !row.startsAt ? "scheduled" : "active";
  const pricing = selected.map(({ target, option, base, amount }, i) => ({
    label: target.appliesTo === "setup" ? "Setup fee" :
      option.billingMode === "managed_monthly" ? "Monthly subscription" :
      option.billingMode === "managed_annual" ? "Annual subscription" :
      option.billingMode === "self_hosted" ? "Self-hosted project" : "Once-off project",
    regular: zar(base),
    promotional: zar(amount),
    cadence: target.appliesTo === "setup" ? "once-off" :
      option.billingMode === "managed_monthly" ? "/month" :
      option.billingMode === "managed_annual" ? "/year" : "once-off",
    featured: i === 0,
    note: target.discountedMonths ? `Discount applies for ${target.discountedMonths} monthly billing periods.` : undefined,
  }));
  return {
    id: row.id, slug: row.slug, source: "database",
    targetPriceOptionId: primary.option.id,
    name: row.name, shortDescription: str(content.shortDescription, row.description),
    description: row.description, status,
    startDate: date(row.startsAt), endDate: date(row.endsAt),
    isFeatured: row.isFeatured, sortOrder: row.sortOrder,
    pricing, eligibility: strings(content.eligibility).length ? strings(content.eligibility) : row.eligibility ? [row.eligibility] : [],
    terms: strings(content.terms),
    images: Array.isArray(content.images) ? content.images.filter((img): img is PromotionImage =>
      typeof img === "object" && img !== null && typeof img.src === "string" && typeof img.alt === "string") : [],
    cta: { label: str(content.ctaLabel, "Enquire about this offer"), href: "/contact" },
    relatedService: "web-development", relatedPackage: packageId,
    maximumCustomers: row.maximumCustomers ?? undefined,
    included: strings(content.included),
    howItWorks: Array.isArray(content.howItWorks) ? content.howItWorks.filter((step): step is PromotionStep =>
      typeof step === "object" && step !== null && typeof step.title === "string" && typeof step.description === "string") : [],
    faqs: Array.isArray(content.faqs) ? content.faqs.filter((faq): faq is PromotionFaq =>
      typeof faq === "object" && faq !== null && typeof faq.q === "string" && typeof faq.a === "string") : [],
    billingNote: str(content.billingNote) || undefined,
    savingsCallout: str(content.savingsCallout) || undefined,
  };
}
