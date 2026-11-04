import { boolean, integer, jsonb, pgTable, text, timestamp, uniqueIndex } from "drizzle-orm/pg-core";

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
