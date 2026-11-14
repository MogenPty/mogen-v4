"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { getCatalogueDb } from "@/db/client";
import { webPackages, webPackagePrices, webPromotions, webPromotionPrices } from "@/db/schema";
import { requireCatalogueAdmin } from "./access";
import { isPublicWebPrice, validPromotionTarget, applyDiscountCents, type WebPriceOption, type WebPromotionTarget } from "@/lib/catalogue/commercial";

const id = z.string().trim().min(1).max(120).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/);
const text = z.string().trim().max(3000);
const money = z.coerce.number().int().min(0).max(100_000_000);
const statuses = ["draft", "published", "retired"] as const;
const campaignStatuses = ["draft", "scheduled", "active", "expired", "archived"] as const;
const field = (data: FormData, name: string) => String(data.get(name) ?? "");
const boolean = (data: FormData, name: string) => data.get(name) === "on";
const list = (input: string) => input.split("\n").map(s => s.trim()).filter(Boolean);
/** Admin date/time controls use South African Standard Time (UTC+02:00). */
const dateValue = (input: string) => input ? new Date(`${input}+02:00`) : null;
function validDate(input: string) {
  const value = dateValue(input);
  if (input && (!value || Number.isNaN(value.getTime()))) throw new Error("Enter a valid date/time.");
  return value;
}
function refresh() {
  revalidatePath("/");
  revalidatePath("/pricing");
  revalidatePath("/services/web-development");
  revalidatePath("/locations/[slug]", "page");
  revalidatePath("/promotions");
  revalidatePath("/promotions/[slug]", "page");
  revalidatePath("/admin/packages");
  revalidatePath("/admin/promotions");
}

/** Create an unpublished tier. A unique stage and slug are required. */
export async function createPackageAction(data: FormData) {
  await requireCatalogueAdmin();
  const slug = id.parse(field(data, "id"));
  const name = z.string().trim().min(2).max(120).parse(field(data, "name"));
  const stage = z.coerce.number().int().min(1).max(50).parse(field(data, "stage"));
  const db = getCatalogueDb();
  // Database also enforces unique stage; never shift existing stages implicitly.
  const all = await db.select({ id: webPackages.id, stage: webPackages.stage }).from(webPackages);
  if (all.some(pkg => pkg.id === slug || pkg.stage === stage)) throw new Error("Package ID or stage already exists.");
  await db.insert(webPackages).values({
    id: slug, name, stage, summary: "", description: "",
    websiteIncluded: boolean(data, "websiteIncluded"),
    features: [], seoScope: [], exclusions: [],
    pricingLabel: "Request a quote", status: "draft",
  });
  refresh();
  redirect(`/admin/packages/${slug}`);
}

/** Create an unpublished billing option, leaving money unapproved until edited. */
export async function createPriceAction(data: FormData) {
  await requireCatalogueAdmin();
  const packageId = id.parse(field(data, "packageId"));
  const mode = z.enum(["managed_monthly", "managed_annual", "once_off", "self_hosted"]).parse(field(data, "billingMode"));
  if ((packageId === "seed") !== (mode === "once_off"))
    throw new Error("Seed is Once-Off only; other packages cannot use Once-Off.");
  const db = getCatalogueDb();
  const [pkg] = await db.select().from(webPackages).where(eq(webPackages.id, packageId)).limit(1);
  if (!pkg) throw new Error("Package not found.");
  const optionId = `${packageId}-${mode.replaceAll("_", "-")}`;
  const existing = await db.select({ id: webPackagePrices.id, billingMode: webPackagePrices.billingMode })
    .from(webPackagePrices).where(eq(webPackagePrices.packageId, packageId));
  if (existing.some(option => option.id === optionId || option.billingMode === mode))
    throw new Error("That package already has this billing option.");
  const managed = mode === "managed_monthly" || mode === "managed_annual";
  await db.insert(webPackagePrices).values({
    id: optionId, packageId, billingMode: mode,
    currency: "ZAR", amountCents: null, setupFeeCents: null,
    status: "draft",
    hostingResponsibility: managed ? "mogen" : mode === "self_hosted" ? "customer" : "not_applicable",
    maintenanceResponsibility: managed ? "mogen" : mode === "self_hosted" ? "customer" : "not_applicable",
    handoverPolicy: "", notes: "",
  });
  refresh();
  redirect(`/admin/packages/${packageId}`);
}

export async function updatePackageAction(data: FormData) {
  await requireCatalogueAdmin();
  const parsed = z.object({
    id, name: z.string().trim().min(2).max(120),
    summary: text, description: text,
    status: z.enum(statuses),
    pricingLabel: z.string().trim().min(1).max(120),
    maxPages: z.string(),
  }).parse({
    id: field(data, "id"), name: field(data, "name"),
    summary: field(data, "summary"), description: field(data, "description"),
    status: field(data, "status"), pricingLabel: field(data, "pricingLabel"),
    maxPages: field(data, "maxPages"),
  });
  const pages = parsed.maxPages.trim() ? z.coerce.number().int().min(0).parse(parsed.maxPages) : null;
  const db = getCatalogueDb();
  const [existing] = await db.select().from(webPackages).where(eq(webPackages.id, parsed.id)).limit(1);
  if (!existing) throw new Error("Package not found.");
  // Preserve catalogue identity, stage, and website capability; do not allow casual structural changes.
  await db.update(webPackages).set({
    name: parsed.name, summary: parsed.summary, description: parsed.description,
    pricingLabel: parsed.pricingLabel, maxPages: pages, status: parsed.status,
    features: list(field(data, "features")),
    seoScope: list(field(data, "seoScope")),
    exclusions: list(field(data, "exclusions")),
    updatedAt: new Date(),
  }).where(eq(webPackages.id, parsed.id));
  refresh();
  redirect(`/admin/packages/${parsed.id}?saved=1`);
}

export async function updatePriceAction(data: FormData) {
  await requireCatalogueAdmin();
  const priceId = id.parse(field(data, "id"));
  const status = z.enum(statuses).parse(field(data, "status"));
  const amount = field(data, "amountCents").trim() ? money.parse(field(data, "amountCents")) : null;
  const setup = field(data, "setupFeeCents").trim() ? money.parse(field(data, "setupFeeCents")) : null;
  const db = getCatalogueDb();
  const [current] = await db.select().from(webPackagePrices).where(eq(webPackagePrices.id, priceId)).limit(1);
  if (!current) throw new Error("Price option not found.");
  const [pkg] = await db.select().from(webPackages).where(eq(webPackages.id, current.packageId)).limit(1);
  if (!pkg) throw new Error("Parent package missing.");
  const handoverPolicy = z.string().trim().max(1000).parse(field(data, "handoverPolicy"));
  const notes = z.string().trim().max(2000).parse(field(data, "notes"));
  const minimumMonths = field(data, "minimumMonths").trim() ? z.coerce.number().int().min(0).parse(field(data, "minimumMonths")) : null;
  const depositPercent = field(data, "depositPercent").trim() ? z.coerce.number().int().min(0).max(100).parse(field(data, "depositPercent")) : null;
  const candidate = { ...current, amountCents: amount, setupFeeCents: setup, status, handoverPolicy, minimumMonths, depositPercent };
  if (status === "published" && !isPublicWebPrice(candidate as WebPriceOption, new Set([pkg.id]))) {
    throw new Error("Price cannot be published: check package publication, billing mode, dates and responsibilities.");
  }
  await db.update(webPackagePrices).set({
    status, amountCents: amount, setupFeeCents: setup, handoverPolicy, notes, minimumMonths, depositPercent, updatedAt: new Date(),
  }).where(eq(webPackagePrices.id, priceId));
  refresh();
  redirect(`/admin/packages/${current.packageId}?saved=1`);
}

export async function createPromotionAction(data: FormData) {
  await requireCatalogueAdmin();
  const slug = id.parse(field(data, "slug"));
  const name = z.string().trim().min(3).max(160).parse(field(data, "name"));
  const db = getCatalogueDb();
  const [exists] = await db.select({ id: webPromotions.id }).from(webPromotions).where(eq(webPromotions.slug, slug)).limit(1);
  if (exists) throw new Error("A promotion with this slug already exists.");
  await db.insert(webPromotions).values({
    id: slug, slug, name,
    description: "", status: "draft", isFeatured: false,
    presentation: {}, updatedAt: new Date(),
  });
  refresh();
  redirect(`/admin/promotions/${slug}`);
}

export async function updatePromotionAction(data: FormData) {
  await requireCatalogueAdmin();
  const campaignId = id.parse(field(data, "id"));
  const name = z.string().trim().min(3).max(160).parse(field(data, "name"));
  const description = text.parse(field(data, "description"));
  const shortDescription = z.string().trim().max(300).parse(field(data, "shortDescription"));
  const ctaLabel = z.string().trim().max(100).parse(field(data, "ctaLabel"));
  const terms = list(field(data, "terms"));
  const eligibility = list(field(data, "eligibility"));
  const included = list(field(data, "included"));
  const location = z.enum(["", "maboloka", "soshanguve", "centurion"]).parse(field(data, "locationSlug"));
  const sortOrder = z.coerce.number().int().min(0).max(9999).parse(field(data, "sortOrder"));
  const maxCustomers = field(data, "maximumCustomers").trim()
    ? z.coerce.number().int().positive().parse(field(data, "maximumCustomers")) : null;
  const startsAt = validDate(field(data, "startsAt"));
  const endsAt = validDate(field(data, "endsAt"));
  if (startsAt && endsAt && startsAt >= endsAt) throw new Error("End must be later than start.");
  const db = getCatalogueDb();
  const [existing] = await db.select().from(webPromotions).where(eq(webPromotions.id, campaignId)).limit(1);
  if (!existing) throw new Error("Promotion not found.");
  if (existing.status === "active") throw new Error("Expire the active promotion before editing its marketing content.");
  const presentation = {
    ...((existing.presentation && typeof existing.presentation === "object" && !Array.isArray(existing.presentation))
      ? existing.presentation as Record<string, unknown> : {}),
    shortDescription, ctaLabel, terms, eligibility, included,
  };
  await db.update(webPromotions).set({
    name, description, eligibility: eligibility.join("; "), locationSlug: location || null,
    maximumCustomers: maxCustomers, isFeatured: boolean(data, "isFeatured"),
    sortOrder, startsAt, endsAt, presentation, updatedAt: new Date(),
  }).where(eq(webPromotions.id, campaignId));
  refresh();
  redirect(`/admin/promotions/${campaignId}?saved=1`);
}

/** A promotion target is one billing option and one discount. Save in draft before publishing. */
export async function savePromotionTargetAction(data: FormData) {
  await requireCatalogueAdmin();
  const campaignId = id.parse(field(data, "promotionId"));
  const optionId = id.parse(field(data, "packagePriceId"));
  const appliesTo = z.enum(["recurring", "setup", "project"]).parse(field(data, "appliesTo"));
  const kind = z.enum(["fixed", "percent"]).parse(field(data, "discountKind"));
  const rawDiscount = money.parse(field(data, "discountValue"));
  const months = field(data, "discountedMonths").trim()
    ? z.coerce.number().int().positive().parse(field(data, "discountedMonths")) : null;
  const db = getCatalogueDb();
  const [campaign] = await db.select().from(webPromotions).where(eq(webPromotions.id, campaignId)).limit(1);
  const [option] = await db.select().from(webPackagePrices).where(eq(webPackagePrices.id, optionId)).limit(1);
  if (!campaign || !option) throw new Error("Campaign or option not found.");
  if (!["draft", "scheduled", "expired"].includes(campaign.status))
    throw new Error("Expire the active promotion before changing its discount.");
  const [pkg] = await db.select().from(webPackages).where(eq(webPackages.id, option.packageId)).limit(1);
  if (!pkg || !isPublicWebPrice(option as WebPriceOption, new Set(pkg.status === "published" ? [pkg.id] : [])))
    throw new Error("Only currently public, approved prices can be discounted.");
  if (kind === "percent" && rawDiscount > 10000) throw new Error("Percentage cannot exceed 100%.");
  const target: WebPromotionTarget = {
    promotionId: campaignId, packagePriceId: optionId, appliesTo, discountKind: kind,
    discountAmountCents: kind === "fixed" ? rawDiscount : null,
    discountPercentBps: kind === "percent" ? rawDiscount : null,
    discountedMonths: months,
  };
  const billingMode = z.enum(["managed_monthly", "managed_annual", "once_off", "self_hosted"]).parse(option.billingMode);
  if (!validPromotionTarget(target, billingMode)) throw new Error("Discount does not apply to this payment mode.");
  const base = appliesTo === "setup" ? option.setupFeeCents : option.amountCents;
  if (base === null || applyDiscountCents(base, target) === base)
    throw new Error("The discount must reduce a nonzero price.");
  // Single-target campaign for now: prevents ambiguity in CTA option routing.
  await db.delete(webPromotionPrices).where(eq(webPromotionPrices.promotionId, campaignId));
  await db.insert(webPromotionPrices).values(target);
  refresh();
  redirect(`/admin/promotions/${campaignId}?saved=1`);
}

export async function setPromotionStatusAction(data: FormData) {
  await requireCatalogueAdmin();
  const campaignId = id.parse(field(data, "id"));
  const next = z.enum(campaignStatuses).parse(field(data, "status"));
  const db = getCatalogueDb();
  const [campaign] = await db.select().from(webPromotions).where(eq(webPromotions.id, campaignId)).limit(1);
  if (!campaign) throw new Error("Promotion not found.");
  if (next === "active" || next === "scheduled") {
    const [targets, packages, options] = await Promise.all([
      db.select().from(webPromotionPrices).where(eq(webPromotionPrices.promotionId, campaignId)),
      db.select().from(webPackages).where(eq(webPackages.status, "published")),
      db.select().from(webPackagePrices).where(eq(webPackagePrices.status, "published")),
    ]);
    const { projectPromotion } = await import("@/lib/catalogue/promotion-projection");
    const validated = projectPromotion(
      { ...campaign, status: next },
      targets as WebPromotionTarget[], options.filter(option => isPublicWebPrice(option as WebPriceOption, new Set(packages.map(p => p.id)))) as WebPriceOption[],
    );
    if (!validated || validated.status === "expired") throw new Error("Campaign cannot be published: check approved content, terms, price target and schedule.");
    if (next === "scheduled" && (!campaign.startsAt || campaign.startsAt <= new Date()))
      throw new Error("Scheduled campaigns must have a future start date.");
  }
  await db.update(webPromotions).set({
    status: next,
    isFeatured: next === "active" ? campaign.isFeatured : false,
    updatedAt: new Date(),
  }).where(eq(webPromotions.id, campaignId));
  refresh();
  redirect(`/admin/promotions/${campaignId}?saved=1`);
}
