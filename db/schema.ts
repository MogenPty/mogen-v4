import { sql } from "drizzle-orm";
import { bigint, boolean, check, integer, jsonb, pgTable, text, timestamp, uuid, uniqueIndex, index, primaryKey } from "drizzle-orm/pg-core";

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
 * Managed Annual amount_cents is the full recurring yearly payment, not a
 * first-year fee; there is no separate renewal_amount_cents column.
 * This table stores responsibilities separately from payment timing.
 */
export const webPackagePrices = pgTable("web_package_prices", {
  id: text("id").primaryKey(),
  packageId: text("package_id").notNull().references(() => webPackages.id),
  billingMode: text("billing_mode").notNull(), // managed_monthly | managed_annual | once_off (Seed only) | self_hosted
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
  slug: text("slug"),
  isFeatured: boolean("is_featured").notNull().default(false),
  sortOrder: integer("sort_order").notNull().default(100),
  presentation: jsonb("presentation").notNull().default({}),
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

/**
 * Private document metadata only; file bytes live in a private Neon Object
 * Storage bucket. Do not expose these tables or S3 credentials to public APIs.
 * Migration: drizzle/0007_private_documents.sql (manual development branch).
 */
export const privateDocuments = pgTable("private_documents", {
  id: uuid("id").primaryKey(),
  title: text("title").notNull(),
  documentType: text("document_type").notNull(),
  status: text("status").notNull().default("draft"),
  classification: text("classification").notNull().default("confidential"),
  relatedCustomerId: text("related_customer_id"),
  createdBy: text("created_by").notNull(),
  currentVersion: integer("current_version").notNull().default(0),
  legalHold: boolean("legal_hold").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, t => [
  index("private_documents_customer_idx").on(t.relatedCustomerId),
]);

export const privateDocumentVersions = pgTable("private_document_versions", {
  id: uuid("id").primaryKey(),
  documentId: uuid("document_id").notNull().references(() => privateDocuments.id, { onDelete: "restrict" }),
  versionNumber: integer("version_number").notNull(),
  bucket: text("bucket").notNull().default("assets"),
  objectKey: text("object_key").notNull().unique(),
  originalFilename: text("original_filename").notNull(),
  contentType: text("content_type").notNull(),
  sizeBytes: bigint("size_bytes", { mode: "number" }).notNull(),
  sha256Hex: text("sha256_hex").notNull(),
  uploadedBy: text("uploaded_by").notNull(),
  scanStatus: text("scan_status").notNull().default("pending"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, t => [
  uniqueIndex("private_document_versions_doc_version_unique").on(t.documentId, t.versionNumber),
  index("private_document_versions_doc_idx").on(t.documentId, t.versionNumber),
]);

export const privateDocumentAccessLog = pgTable("private_document_access_log", {
  id: bigint("id", { mode: "number" }).primaryKey().generatedAlwaysAsIdentity(),
  documentId: uuid("document_id").references(() => privateDocuments.id, { onDelete: "set null" }),
  versionId: uuid("version_id").references(() => privateDocumentVersions.id, { onDelete: "set null" }),
  actorId: text("actor_id").notNull(),
  action: text("action").notNull(),
  outcome: text("outcome").notNull(),
  reason: text("reason"),
  occurredAt: timestamp("occurred_at", { withTimezone: true }).notNull().defaultNow(),
}, t => [
  index("private_doc_log_doc_idx").on(t.documentId, t.occurredAt),
]);

/**
 * Server-side redirects. Paths use one of three canonical match forms:
 * exact, a terminal `:segment`, or a terminal `:path*` catch-all.
 */
export const redirectRules = pgTable("redirect_rules", {
  id: uuid("id").primaryKey().defaultRandom(),
  sourcePath: text("source_path").notNull(),
  destinationPath: text("destination_path").notNull(),
  matchType: text("match_type").notNull().default("exact"),
  statusCode: integer("status_code").notNull().default(308),
  isActive: boolean("is_active").notNull().default(true),
  isAutomatic: boolean("is_automatic").notNull().default(false),
  preserveQuery: boolean("preserve_query").notNull().default(true),
  entityType: text("entity_type"),
  entityId: text("entity_id"),
  description: text("description").notNull().default(""),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  createdBy: text("created_by").notNull(),
  expiresAt: timestamp("expires_at", { withTimezone: true }),
  hitCount: bigint("hit_count", { mode: "number" }).notNull().default(0),
  lastHitAt: timestamp("last_hit_at", { withTimezone: true }),
}, t => [
  uniqueIndex("redirect_rules_active_source_unique").on(t.sourcePath).where(sql`${t.isActive} = true`),
  index("redirect_rules_lookup_idx").on(t.isActive, t.sourcePath, t.expiresAt),
  index("redirect_rules_entity_idx").on(t.entityType, t.entityId),
  index("redirect_rules_updated_idx").on(t.updatedAt),
  check("redirect_rules_status_code_check", sql`${t.statusCode} in (301, 302, 307, 308)`),
  check("redirect_rules_match_type_check", sql`${t.matchType} in ('exact', 'segment', 'splat')`),
  check("redirect_rules_source_shape_check", sql`
    ${t.sourcePath} like '/%'
    and ${t.sourcePath} not like '//%'
    and position('?' in ${t.sourcePath}) = 0
    and position('#' in ${t.sourcePath}) = 0
    and (
      (${t.matchType} = 'exact' and position(':' in ${t.sourcePath}) = 0 and position('*' in ${t.sourcePath}) = 0)
      or (${t.matchType} = 'segment' and ${t.sourcePath} ~ '/:segment$')
      or (${t.matchType} = 'splat' and ${t.sourcePath} ~ '/:path\\*$')
    )
  `),
  check("redirect_rules_destination_shape_check", sql`
    ${t.destinationPath} like '/%'
    and ${t.destinationPath} not like '//%'
    and position('?' in ${t.destinationPath}) = 0
    and position('#' in ${t.destinationPath}) = 0
  `),
  check("redirect_rules_entity_check", sql`
    (${t.isAutomatic} = false)
    or (${t.entityType} is not null and ${t.entityId} is not null)
  `),
  check("redirect_rules_exact_loop_check", sql`
    ${t.matchType} <> 'exact' or ${t.sourcePath} <> ${t.destinationPath}
  `),
]);

/** Explicit 410 responses are separate from redirect rules. */
export const goneResourceRules = pgTable("gone_resource_rules", {
  id: uuid("id").primaryKey().defaultRandom(),
  sourcePath: text("source_path").notNull(),
  matchType: text("match_type").notNull().default("exact"),
  isActive: boolean("is_active").notNull().default(true),
  description: text("description").notNull().default(""),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  createdBy: text("created_by").notNull(),
  expiresAt: timestamp("expires_at", { withTimezone: true }),
  hitCount: bigint("hit_count", { mode: "number" }).notNull().default(0),
  lastHitAt: timestamp("last_hit_at", { withTimezone: true }),
}, t => [
  uniqueIndex("gone_rules_active_source_unique").on(t.sourcePath).where(sql`${t.isActive} = true`),
  index("gone_rules_lookup_idx").on(t.isActive, t.sourcePath, t.expiresAt),
  check("gone_rules_match_type_check", sql`${t.matchType} in ('exact', 'segment', 'splat')`),
  check("gone_rules_source_shape_check", sql`
    ${t.sourcePath} like '/%'
    and ${t.sourcePath} not like '//%'
    and position('?' in ${t.sourcePath}) = 0
    and position('#' in ${t.sourcePath}) = 0
    and (
      (${t.matchType} = 'exact' and position(':' in ${t.sourcePath}) = 0 and position('*' in ${t.sourcePath}) = 0)
      or (${t.matchType} = 'segment' and ${t.sourcePath} ~ '/:segment$')
      or (${t.matchType} = 'splat' and ${t.sourcePath} ~ '/:path\\*$')
    )
  `),
]);

/** Immutable mutation history. Snapshots survive deletion of the live rule. */
export const redirectHistory = pgTable("redirect_history", {
  id: bigint("id", { mode: "number" }).primaryKey().generatedAlwaysAsIdentity(),
  redirectId: uuid("redirect_id").references(() => redirectRules.id, { onDelete: "set null" }),
  goneRuleId: uuid("gone_rule_id").references(() => goneResourceRules.id, { onDelete: "set null" }),
  action: text("action").notNull(),
  actor: text("actor").notNull(),
  before: jsonb("before_state").$type<Record<string, unknown>>(),
  after: jsonb("after_state").$type<Record<string, unknown>>(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, t => [
  index("redirect_history_redirect_idx").on(t.redirectId, t.createdAt),
  index("redirect_history_gone_idx").on(t.goneRuleId, t.createdAt),
  index("redirect_history_created_idx").on(t.createdAt),
  check("redirect_history_action_check", sql`${t.action} in ('create', 'update', 'enable', 'disable', 'delete', 'import', 'automatic')`),
]);

/** Single generation value used by warm Proxy instances to refresh snapshots. */
export const redirectCacheState = pgTable("redirect_cache_state", {
  key: text("key").primaryKey(),
  generation: bigint("generation", { mode: "number" }).notNull().default(1),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

/** Privacy-safe aggregate of public paths that produced a 404. */
export const notFoundPaths = pgTable("not_found_paths", {
  id: uuid("id").primaryKey().defaultRandom(),
  requestedPath: text("requested_path").notNull(),
  firstSeenAt: timestamp("first_seen_at", { withTimezone: true }).notNull().defaultNow(),
  lastSeenAt: timestamp("last_seen_at", { withTimezone: true }).notNull().defaultNow(),
  hitCount: bigint("hit_count", { mode: "number" }).notNull().default(1),
  referrer: text("referrer"),
  userAgentClass: text("user_agent_class").notNull().default("unknown"),
  resolutionStatus: text("resolution_status").notNull().default("open"),
  resolutionRedirectId: uuid("resolution_redirect_id").references(() => redirectRules.id, { onDelete: "set null" }),
  retainUntil: timestamp("retain_until", { withTimezone: true }).notNull(),
}, t => [
  uniqueIndex("not_found_paths_requested_unique").on(t.requestedPath),
  index("not_found_paths_open_hits_idx").on(t.resolutionStatus, t.hitCount, t.lastSeenAt),
  index("not_found_paths_retention_idx").on(t.retainUntil),
  check("not_found_paths_status_check", sql`${t.resolutionStatus} in ('open', 'redirected', 'gone', 'ignored')`),
  check("not_found_paths_ua_check", sql`${t.userAgentClass} in ('browser', 'search', 'ai', 'social', 'automation', 'unknown')`),
]);

export const searchConsoleImports = pgTable("search_console_imports", {
  id: uuid("id").primaryKey().defaultRandom(),
  filename: text("filename").notNull(),
  importedBy: text("imported_by").notNull(),
  rowCount: integer("row_count").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, t => [
  check("search_console_imports_row_count_check", sql`${t.rowCount} >= 0`),
]);

export const searchConsoleImportRows = pgTable("search_console_import_rows", {
  id: uuid("id").primaryKey().defaultRandom(),
  importId: uuid("import_id").notNull().references(() => searchConsoleImports.id, { onDelete: "cascade" }),
  sourcePath: text("source_path").notNull(),
  status: text("status").notNull().default("pending"),
  suggestedDestination: text("suggested_destination"),
  suggestionReason: text("suggestion_reason"),
  createdRedirectId: uuid("created_redirect_id").references(() => redirectRules.id, { onDelete: "set null" }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, t => [
  uniqueIndex("search_console_rows_import_source_unique").on(t.importId, t.sourcePath),
  index("search_console_rows_status_idx").on(t.importId, t.status),
  check("search_console_rows_status_check", sql`${t.status} in ('pending', 'approved', 'skipped', 'created')`),
]);
