import { boolean, integer, jsonb, pgTable, text, timestamp, uniqueIndex, index, primaryKey } from "drizzle-orm/pg-core";

/** Product scope and display content; never store currency values as floats. */
export const webPackages = pgTable("web_packages", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  stage: integer("stage").notNull(),
  summary: text("summary").notNull(),
  description: text("description").notNull().default(""),
  websiteIncluded: boolean("website_included").notNull().default(true),
  maxPages: integer("max_pages"),
  features: jsonb("features").$type<string[]>().notNull().default([]),
  seoScope: jsonb("seo_scope").$type<string[]>().notNull().default([]),
  exclusions: jsonb("exclusions").$type<string[]>().notNull().default([]),
  status: text("status").notNull().default("draft"),
  pricingLabel: text("pricing_label").notNull().default("Request a quote"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [uniqueIndex("web_packages_stage_unique").on(t.stage)]);

export const webLocationOffers = pgTable("web_location_offers", {
  locationSlug: text("location_slug").primaryKey(),
  featuredPackageId: text("featured_package_id").notNull().references(() => webPackages.id),
  slots: jsonb("slots").$type<Array<{kind: "package" | "explore"; packageId?: string; direction?: "smaller" | "larger"}>>().notNull(),
  seedCallout: text("seed_callout").notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

/**
 * Each package can have multiple commercial options. All amounts are
 * integer minor units (ZAR cents); null means not priced/approved.
 * This table stores responsibilities separately from payment timing.
 */
export const webPackagePrices = pgTable("web_package_prices", {
  id: text("id").primaryKey(),
  packageId: text("package_id").notNull().references(() => webPackages.id),
  billingMode: text("billing_mode").notNull(), // managed_monthly | once_off | self_hosted
  currency: text("currency").notNull().default("ZAR"),
  amountCents: integer("amount_cents"),
  setupFeeCents: integer("setup_fee_cents"),
  depositPercent: integer("deposit_percent"),
  minimumMonths: integer("minimum_months"),
  initialHostingMonths: integer("initial_hosting_months"),
  hostingResponsibility: text("hosting_responsibility").notNull(), // mogen | customer
  maintenanceResponsibility: text("maintenance_responsibility").notNull(), // mogen | customer
  handoverPolicy: text("handover_policy").notNull(),
  notes: text("notes").notNull().default(""),
  status: text("status").notNull().default("draft"),
  effectiveFrom: timestamp("effective_from", { withTimezone: true }),
  effectiveUntil: timestamp("effective_until", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, t => [
  index("web_package_prices_package_idx").on(t.packageId),
  index("web_package_prices_status_idx").on(t.status),
]);

/** Campaign metadata; a promotion does not represent a payment mode. */
export const webPromotions = pgTable("web_promotions", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description").notNull().default(""),
  status: text("status").notNull().default("draft"),
  startsAt: timestamp("starts_at", { withTimezone: true }),
  endsAt: timestamp("ends_at", { withTimezone: true }),
  locationSlug: text("location_slug"), // null applies nationally
  eligibility: text("eligibility").notNull().default(""),
  maximumCustomers: integer("maximum_customers"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

/**
 * A campaign may target multiple pricing options with independent discounts.
 * amount_cents is a fixed discount; percent_bps is a discount in basis points.
 * A discounted_months limit applies only to monthly recurring reductions.
 */
export const webPromotionPrices = pgTable("web_promotion_prices", {
  promotionId: text("promotion_id").notNull().references(() => webPromotions.id),
  packagePriceId: text("package_price_id").notNull().references(() => webPackagePrices.id),
  appliesTo: text("applies_to").notNull(), // recurring | setup | project
  discountKind: text("discount_kind").notNull(), // fixed | percent
  discountAmountCents: integer("discount_amount_cents"),
  discountPercentBps: integer("discount_percent_bps"),
  discountedMonths: integer("discounted_months"),
}, t => [
  primaryKey({ columns: [t.promotionId, t.packagePriceId, t.appliesTo] }),
  index("web_promotion_prices_price_idx").on(t.packagePriceId),
]);
