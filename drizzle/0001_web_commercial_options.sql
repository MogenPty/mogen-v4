-- Manual, additive migration for the existing Neon DEVELOPMENT catalogue.
-- This project has not yet established drizzle-kit snapshots/journal. Do not
-- run drizzle-kit migrate against 0000 or this file until it is baselined.
-- No published prices, promotions, or price rows are seeded.
BEGIN;

CREATE TABLE IF NOT EXISTS "web_package_prices" (
  "id" text PRIMARY KEY NOT NULL,
  "package_id" text NOT NULL REFERENCES "web_packages"("id"),
  "billing_mode" text NOT NULL,
  "currency" text NOT NULL DEFAULT 'ZAR',
  "amount_cents" integer,
  "setup_fee_cents" integer,
  "deposit_percent" integer,
  "minimum_months" integer,
  "initial_hosting_months" integer,
  "hosting_responsibility" text NOT NULL,
  "maintenance_responsibility" text NOT NULL,
  "handover_policy" text NOT NULL,
  "notes" text NOT NULL DEFAULT '',
  "status" text NOT NULL DEFAULT 'draft',
  "effective_from" timestamptz,
  "effective_until" timestamptz,
  "created_at" timestamptz NOT NULL DEFAULT now(),
  "updated_at" timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT "web_package_prices_mode_check"
    CHECK ("billing_mode" IN ('managed_monthly', 'once_off', 'self_hosted')),
  CONSTRAINT "web_package_prices_currency_check" CHECK ("currency" = 'ZAR'),
  CONSTRAINT "web_package_prices_responsibility_check"
    CHECK ("hosting_responsibility" IN ('mogen', 'customer')
       AND "maintenance_responsibility" IN ('mogen', 'customer')),
  CONSTRAINT "web_package_prices_status_check"
    CHECK ("status" IN ('draft', 'published', 'retired')),
  CONSTRAINT "web_package_prices_amount_check"
    CHECK (("amount_cents" IS NULL OR "amount_cents" >= 0)
       AND ("setup_fee_cents" IS NULL OR "setup_fee_cents" >= 0)),
  CONSTRAINT "web_package_prices_deposit_check"
    CHECK ("deposit_percent" IS NULL OR "deposit_percent" BETWEEN 0 AND 100),
  CONSTRAINT "web_package_prices_duration_check"
    CHECK (("minimum_months" IS NULL OR "minimum_months" >= 0)
       AND ("initial_hosting_months" IS NULL OR "initial_hosting_months" >= 0)),
  CONSTRAINT "web_package_prices_dates_check"
    CHECK ("effective_until" IS NULL OR "effective_from" IS NULL OR "effective_until" > "effective_from"),
  CONSTRAINT "web_package_prices_mode_responsibility_check"
    CHECK (
      ("billing_mode" <> 'managed_monthly' OR ("hosting_responsibility" = 'mogen' AND "maintenance_responsibility" = 'mogen'))
      AND ("billing_mode" <> 'self_hosted' OR ("hosting_responsibility" = 'customer' AND "maintenance_responsibility" = 'customer'))
    )
);
CREATE INDEX IF NOT EXISTS "web_package_prices_package_idx" ON "web_package_prices" ("package_id");
CREATE INDEX IF NOT EXISTS "web_package_prices_status_idx" ON "web_package_prices" ("status");

CREATE TABLE IF NOT EXISTS "web_promotions" (
  "id" text PRIMARY KEY NOT NULL,
  "name" text NOT NULL,
  "description" text NOT NULL DEFAULT '',
  "status" text NOT NULL DEFAULT 'draft',
  "starts_at" timestamptz,
  "ends_at" timestamptz,
  "location_slug" text,
  "eligibility" text NOT NULL DEFAULT '',
  "maximum_customers" integer,
  "created_at" timestamptz NOT NULL DEFAULT now(),
  "updated_at" timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT "web_promotions_status_check"
    CHECK ("status" IN ('draft', 'scheduled', 'active', 'expired', 'archived')),
  CONSTRAINT "web_promotions_location_check"
    CHECK ("location_slug" IS NULL OR "location_slug" IN ('maboloka', 'soshanguve', 'centurion')),
  CONSTRAINT "web_promotions_dates_check"
    CHECK ("ends_at" IS NULL OR "starts_at" IS NULL OR "ends_at" > "starts_at"),
  CONSTRAINT "web_promotions_max_customers_check"
    CHECK ("maximum_customers" IS NULL OR "maximum_customers" > 0)
);

CREATE TABLE IF NOT EXISTS "web_promotion_prices" (
  "promotion_id" text NOT NULL REFERENCES "web_promotions"("id"),
  "package_price_id" text NOT NULL REFERENCES "web_package_prices"("id"),
  "applies_to" text NOT NULL,
  "discount_kind" text NOT NULL,
  "discount_amount_cents" integer,
  "discount_percent_bps" integer,
  "discounted_months" integer,
  CONSTRAINT "web_promotion_prices_pk" PRIMARY KEY ("promotion_id", "package_price_id", "applies_to"),
  CONSTRAINT "web_promotion_prices_target_check" CHECK ("applies_to" IN ('recurring', 'setup', 'project')),
  CONSTRAINT "web_promotion_prices_kind_check" CHECK (
    ("discount_kind" = 'fixed'
      AND "discount_amount_cents" IS NOT NULL AND "discount_amount_cents" >= 0
      AND "discount_percent_bps" IS NULL)
    OR
    ("discount_kind" = 'percent'
      AND "discount_percent_bps" BETWEEN 0 AND 10000
      AND "discount_amount_cents" IS NULL)
  ),
  CONSTRAINT "web_promotion_prices_months_check"
    CHECK ("discounted_months" IS NULL OR ("applies_to" = 'recurring' AND "discounted_months" > 0))
);
CREATE INDEX IF NOT EXISTS "web_promotion_prices_price_idx" ON "web_promotion_prices" ("package_price_id");

COMMIT;
