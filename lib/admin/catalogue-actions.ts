"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { eq, sql } from "drizzle-orm";
import { z } from "zod";
import { getCatalogueDb } from "@/db/client";
import { webPackages, webPackagePrices, webPromotions, webPromotionPrices } from "@/db/schema";
import { requireCatalogueAdmin } from "./access";
import { isPublicWebPrice, validPromotionTarget, applyDiscountCents, type WebPriceOption, type WebPromotionTarget } from "@/lib/catalogue/commercial";
import { projectPromotion } from "@/lib/catalogue/promotion-projection";

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
function refresh(changedPromotionPaths: string[] = []) {
  revalidatePath("/");
  revalidatePath("/pricing");
  revalidatePath("/services/web-development");
  revalidatePath("/locations/[slug]", "page");
  revalidatePath("/promotions");
  revalidatePath("/promotions/[slug]", "page");
  revalidatePath("/sitemap.xml");
  for (const path of changedPromotionPaths) revalidatePath(path);
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
  redirect(`/admin/promotions/${slug}?created=1`);
}

const promotionWizardSteps = ["details", "pricing", "terms", "publication"] as const;
export type PromotionWizardStep = typeof promotionWizardSteps[number];
export type PromotionWizardState = {
  status: "idle" | "success" | "error";
  step?: PromotionWizardStep;
  message?: string;
};

function promotionPresentation(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? value as Record<string, unknown> : {};
}

function actionError(error: unknown): string {
  if (error instanceof z.ZodError) return error.issues[0]?.message ?? "Check the required fields.";
  return error instanceof Error ? error.message : "The promotion could not be saved.";
}

async function requireEditablePromotion(campaignId: string) {
  const db = getCatalogueDb();
  const [campaign] = await db.select().from(webPromotions).where(eq(webPromotions.id, campaignId)).limit(1);
  if (!campaign) throw new Error("Promotion not found.");
  return { db, campaign };
}

/** Persist one wizard step so later steps never validate against unsaved fields. */
export async function savePromotionWizardStepAction(
  _previous: PromotionWizardState,
  data: FormData,
): Promise<PromotionWizardState> {
  const actor = await requireCatalogueAdmin();
  const step = z.enum(promotionWizardSteps).parse(field(data, "step"));
  try {
    const campaignId = id.parse(field(data, "id"));
    const { db, campaign } = await requireEditablePromotion(campaignId);
    const now = new Date();

    if (step === "details") {
      if (campaign.status === "active") throw new Error("Expire or unpublish the active promotion before changing its content.");
      const name = z.string().trim().min(3).max(160).parse(field(data, "name"));
      const slug = id.parse(field(data, "slug"));
      const description = z.string().trim().min(1, "Add the full promotion description.").max(3000).parse(field(data, "description"));
      const shortDescription = z.string().trim().min(1, "Add a short description.").max(300).parse(field(data, "shortDescription"));
      const ctaLabel = z.string().trim().min(1, "Add a CTA label.").max(100).parse(field(data, "ctaLabel"));
      const location = z.enum(["", "maboloka", "soshanguve", "centurion"]).parse(field(data, "locationSlug"));
      const sortOrder = z.coerce.number().int().min(0).max(9999).parse(field(data, "sortOrder"));
      const maximumCustomers = field(data, "maximumCustomers").trim()
        ? z.coerce.number().int().positive().parse(field(data, "maximumCustomers")) : null;
      const oldPath = campaign.slug ? `/promotions/${campaign.slug}` : null;
      const newPath = `/promotions/${slug}`;
      const presentation = JSON.stringify({
        ...promotionPresentation(campaign.presentation), shortDescription, ctaLabel,
      });

      // A single data-modifying CTE makes the entity update, historical retargeting,
      // new redirect, audit records and cache invalidation all-or-nothing. The
      // optimistic slug predicate also prevents two editors from losing updates.
      const result = await db.execute<{ slug: string }>(sql`
        with updated as (
          update web_promotions as promotion
          set slug = ${slug}, name = ${name}, description = ${description},
              location_slug = ${location || null}, maximum_customers = ${maximumCustomers},
              sort_order = ${sortOrder}, presentation = ${presentation}::jsonb,
              updated_at = ${now}
          where promotion.id = ${campaignId}
            and promotion.slug is not distinct from ${campaign.slug}
            and not exists (
              select 1 from web_promotions other
              where other.slug = ${slug} and other.id <> ${campaignId}
            )
            and not exists (
              select 1 from redirect_rules rule
              where rule.source_path = ${newPath} and rule.is_active = true
            and ${slug} is distinct from ${campaign.slug}
            )
            and not exists (
              select 1 from gone_resource_rules gone
              where gone.source_path = ${newPath} and gone.is_active = true
            and ${slug} is distinct from ${campaign.slug}
            )
          returning promotion.id, promotion.slug
        ), historical as materialized (
          select rule.id, rule.source_path, rule.destination_path
          from redirect_rules rule, updated
          where rule.entity_type = 'promotion'
            and rule.entity_id = ${campaignId}
            and rule.destination_path <> ${newPath}
          for update
        ), retargeted as (
          update redirect_rules as rule
          set destination_path = ${newPath}, updated_at = ${now}
          from historical, updated
          where rule.id = historical.id
          returning rule.id
        ), retarget_history as (
          insert into redirect_history (redirect_id, action, actor, before_state, after_state)
          select historical.id, 'automatic', ${actor},
            jsonb_build_object('sourcePath', historical.source_path, 'destinationPath', historical.destination_path),
            jsonb_build_object('sourcePath', historical.source_path, 'destinationPath', ${newPath})
          from historical join retargeted on retargeted.id = historical.id
        ), new_redirect as (
          insert into redirect_rules (
            source_path, destination_path, match_type, status_code, is_active,
            is_automatic, preserve_query, entity_type, entity_id, description,
            created_by, created_at, updated_at
          )
          select ${oldPath}, ${newPath}, 'exact', 308, true, true, true,
            'promotion', ${campaignId}, 'Automatic redirect after promotion slug change',
            ${actor}, ${now}, ${now}
          from updated
          where ${campaign.slug} is not null and ${campaign.slug} <> ${slug}
          returning id, source_path, destination_path
        ), new_history as (
          insert into redirect_history (redirect_id, action, actor, after_state)
          select id, 'automatic', ${actor},
            jsonb_build_object('sourcePath', source_path, 'destinationPath', destination_path,
              'statusCode', 308, 'entityType', 'promotion', 'entityId', ${campaignId})
          from new_redirect
        ), invalidated as (
          insert into redirect_cache_state (key, generation, updated_at)
          select 'redirects', 1, ${now} from new_redirect
          on conflict (key) do update
            set generation = redirect_cache_state.generation + 1, updated_at = excluded.updated_at
        )
        select slug from updated
      `);
      if (result.rows.length !== 1) {
        throw new Error("The slug is already in use, reserved by a redirect, or the promotion changed in another session. Refresh and try again.");
      }
      refresh(campaign.slug === slug ? [] : [oldPath, newPath].filter((path): path is string => Boolean(path)));
    }

    if (step === "pricing") {
      if (campaign.status === "active") throw new Error("Expire or unpublish the active promotion before changing its discount.");
      const packageId = id.parse(field(data, "pricingPackageId"));
      const targetInput = z.array(z.object({
        packagePriceId: id,
        appliesTo: z.enum(["recurring", "setup", "project"]),
        discountKind: z.enum(["fixed", "percent"]),
        discountValue: z.string().trim().min(1),
        discountedMonths: z.string(),
      })).min(1, "Add at least one plan or setup-fee discount.").parse(JSON.parse(field(data, "targets")));
      const uniqueTargets = new Set(targetInput.map(item => `${item.packagePriceId}:${item.appliesTo}`));
      if (uniqueTargets.size !== targetInput.length) throw new Error("Each plan price can only have one discount of each type.");
      const [options, packages] = await Promise.all([
        db.select().from(webPackagePrices),
        db.select().from(webPackages).where(eq(webPackages.status, "published")),
      ]);
      const pkg = packages.find(item => item.id === packageId);
      if (!pkg) throw new Error("Choose a published package.");
      const publishedPackageIds = new Set(packages.map(item => item.id));
      const targets = targetInput.map(input => {
        const option = options.find(item => item.id === input.packagePriceId);
        if (!option || option.packageId !== packageId || !isPublicWebPrice(option as WebPriceOption, publishedPackageIds))
          throw new Error("Every selected payment plan must be a public price for the chosen package.");
        const humanDiscount = z.coerce.number().finite().positive("Enter a discount greater than zero.").parse(input.discountValue);
        if (input.discountKind === "percent" && humanDiscount > 100) throw new Error("Percentage discounts cannot exceed 100%.");
        const rawDiscount = Math.round(humanDiscount * 100);
        const discountedMonths = input.discountedMonths.trim()
          ? z.coerce.number().int().positive().parse(input.discountedMonths) : null;
        const target: WebPromotionTarget = {
          promotionId: campaignId,
          packagePriceId: option.id,
          appliesTo: input.appliesTo,
          discountKind: input.discountKind,
          discountAmountCents: input.discountKind === "fixed" ? rawDiscount : null,
          discountPercentBps: input.discountKind === "percent" ? rawDiscount : null,
          discountedMonths,
        };
        const billingMode = z.enum(["managed_monthly", "managed_annual", "once_off", "self_hosted"]).parse(option.billingMode);
        if (!validPromotionTarget(target, billingMode))
          throw new Error(`${pkg.name}'s ${billingMode.replaceAll("_", " ")} plan cannot use a ${input.appliesTo} discount.`);
        const base = input.appliesTo === "setup" ? option.setupFeeCents : option.amountCents;
        if (base === null || base === 0) {
          const mainPrice = new Intl.NumberFormat("en-ZA", { style: "currency", currency: "ZAR", maximumFractionDigits: 0 })
            .format((option.amountCents ?? 0) / 100);
          throw new Error(`${pkg.name}'s ${billingMode.replaceAll("_", " ")} plan has no ${input.appliesTo === "setup" ? "setup fee" : "price"} to discount. Its main price is ${mainPrice}.`);
        }
        if (applyDiscountCents(base, target) === base)
          throw new Error(`The ${input.appliesTo} discount is too small to reduce this price.`);
        return target;
      });
      await db.batch([
        db.delete(webPromotionPrices).where(eq(webPromotionPrices.promotionId, campaignId)),
        db.insert(webPromotionPrices).values(targets),
      ]);
    }

    if (step === "terms") {
      if (campaign.status === "active") throw new Error("Expire or unpublish the active promotion before changing its terms.");
      const terms = list(field(data, "terms"));
      if (!terms.length) throw new Error("Add at least one promotion term.");
      const eligibility = list(field(data, "eligibility"));
      const included = list(field(data, "included"));
      await db.update(webPromotions).set({
        eligibility: eligibility.join("; "),
        presentation: { ...promotionPresentation(campaign.presentation), terms, eligibility, included },
        updatedAt: now,
      }).where(eq(webPromotions.id, campaignId));
    }

    if (step === "publication") {
      const status = z.enum(campaignStatuses).parse(field(data, "status"));
      const startsAt = validDate(field(data, "startsAt"));
      const endsAt = validDate(field(data, "endsAt"));
      if (startsAt && endsAt && startsAt >= endsAt) throw new Error("End must be later than start.");
      const isFeatured = status === "expired" || status === "archived" ? false : boolean(data, "isFeatured");
      if (status === "active" || status === "scheduled") {
        if (status === "scheduled" && (!startsAt || startsAt <= now))
          throw new Error("Scheduled promotions must have a future start date.");
        if (status === "active" && startsAt && startsAt > now)
          throw new Error("Active promotions cannot have a future start date. Choose Scheduled instead.");
        const [targets, packages, options] = await Promise.all([
          db.select().from(webPromotionPrices).where(eq(webPromotionPrices.promotionId, campaignId)),
          db.select().from(webPackages).where(eq(webPackages.status, "published")),
          db.select().from(webPackagePrices).where(eq(webPackagePrices.status, "published")),
        ]);
        const publicPackageIds = new Set(packages.map(item => item.id));
        const publicOptions = options.filter(item => isPublicWebPrice(item as WebPriceOption, publicPackageIds)) as WebPriceOption[];
        const validated = projectPromotion(
          { ...campaign, status, startsAt, endsAt, isFeatured },
          targets as WebPromotionTarget[], publicOptions, now,
        );
        if (!validated || validated.status === "expired")
          throw new Error("Promotion cannot be published. Complete the details, pricing, terms and schedule steps first.");
      }
      await db.update(webPromotions).set({ status, startsAt, endsAt, isFeatured, updatedAt: now })
        .where(eq(webPromotions.id, campaignId));
    }

    if (step !== "details") refresh();
    return { status: "success", step, message: "Changes saved." };
  } catch (error) {
    return { status: "error", step, message: actionError(error) };
  }
}

export async function setPromotionStatusAction(data: FormData) {
  await requireCatalogueAdmin();
  const campaignId = id.parse(field(data, "id"));
  z.literal("expired").parse(field(data, "status"));
  const db = getCatalogueDb();
  const [campaign] = await db.select().from(webPromotions).where(eq(webPromotions.id, campaignId)).limit(1);
  if (!campaign) throw new Error("Promotion not found.");
  await db.update(webPromotions).set({
    status: "expired",
    isFeatured: false,
    updatedAt: new Date(),
  }).where(eq(webPromotions.id, campaignId));
  refresh();
  redirect(`/admin/promotions/${campaignId}?saved=1`);
}
