-- DEVELOPMENT ONLY. Run after 0001 -> 0004 on the verified Neon development branch.
-- Business decision: annual is a recurring managed subscription, NOT a once-off website.
-- R1,499/year (149900 cents) is the SAME amount every year; no separate renewal fee.
-- Managed Monthly and Managed Annually share hosting, maintenance and support.
-- All options remain DRAFT. This is NOT an approval or public price publication.
-- Existing primary keys (e.g. 'sprout-once-off') are deliberately retained because
-- external links / promotion targets may already reference them. The billing_mode
-- is authoritative; option IDs are opaque internal identifiers.
BEGIN;

DO $$
BEGIN
  -- Do not rewrite any already-active offers or unexpected legacy values.
  IF EXISTS (
    SELECT 1 FROM public.web_package_prices
    WHERE package_id <> 'seed' AND billing_mode = 'once_off' AND status <> 'draft'
  ) THEN
    RAISE EXCEPTION 'Non-Seed once_off options must be reviewed and retired before the annual migration.';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM public.web_package_prices
    WHERE id = 'sprout-once-off' AND package_id = 'sprout'
      AND billing_mode = 'once_off' AND status = 'draft'
  ) AND NOT EXISTS (
    SELECT 1 FROM public.web_package_prices
    WHERE id = 'sprout-once-off' AND package_id = 'sprout'
      AND billing_mode = 'managed_annual' AND status = 'draft'
  ) THEN
    RAISE EXCEPTION 'Expected draft Sprout annual option is missing or has unexpected identity/status.';
  END IF;
  IF EXISTS (
    SELECT 1 FROM public.web_package_prices
    WHERE id = 'sprout-once-off'
      AND (amount_cents IS NOT NULL AND amount_cents <> 149900
        OR setup_fee_cents IS NOT NULL AND setup_fee_cents <> 0
        OR minimum_months IS NOT NULL AND minimum_months <> 12)
  ) THEN
    RAISE EXCEPTION 'Sprout annual row has manually edited amounts/terms. Review before proceeding.';
  END IF;
END $$;

-- Allow the new recurring mode before changing the existing draft rows.
ALTER TABLE public.web_package_prices
  DROP CONSTRAINT IF EXISTS web_package_prices_mode_check;
ALTER TABLE public.web_package_prices
  ADD CONSTRAINT web_package_prices_mode_check
  CHECK (billing_mode IN ('managed_monthly', 'managed_annual', 'once_off', 'self_hosted'));

ALTER TABLE public.web_package_prices
  DROP CONSTRAINT IF EXISTS web_package_prices_mode_responsibility_check;

-- Existing draft 'once_off' website options become annually billed managed plans.
-- No new payment options are inserted; no customer-facing status changes.
UPDATE public.web_package_prices
SET billing_mode = 'managed_annual',
    hosting_responsibility = 'mogen',
    maintenance_responsibility = 'mogen',
    handover_policy = 'Same managed hosting, maintenance and support as Managed Monthly; annual billing; source-code ownership and exit terms require agreement.',
    notes = 'DRAFT annual managed subscription. No separate renewal amount: the annual subscription amount recurs every year. Pricing and terms subject to approval.',
    updated_at = now()
WHERE package_id <> 'seed' AND billing_mode = 'once_off' AND status = 'draft';

-- Only Sprout's annual amount/term has been proposed. Leave all other
-- options unpriced, and do not publish this record.
UPDATE public.web_package_prices
SET amount_cents = 149900,
    setup_fee_cents = 0,
    minimum_months = 12,
    initial_hosting_months = NULL,
    deposit_percent = NULL,
    updated_at = now()
WHERE id = 'sprout-once-off'
  AND package_id = 'sprout'
  AND billing_mode = 'managed_annual'
  AND status = 'draft';

-- Both managed payment intervals have identical ongoing responsibilities.
-- Seed alone uses once_off with no website hosting or included maintenance.
ALTER TABLE public.web_package_prices
  ADD CONSTRAINT web_package_prices_mode_responsibility_check
  CHECK (
    (billing_mode NOT IN ('managed_monthly', 'managed_annual')
      OR (hosting_responsibility = 'mogen' AND maintenance_responsibility = 'mogen'))
    AND (billing_mode <> 'self_hosted'
      OR (hosting_responsibility = 'customer' AND maintenance_responsibility = 'customer'))
    AND (billing_mode <> 'once_off'
      OR (package_id = 'seed' AND hosting_responsibility = 'not_applicable'
        AND maintenance_responsibility = 'not_applicable'))
  );

ALTER TABLE public.web_package_prices
  ADD CONSTRAINT web_package_prices_annual_scope_check
  CHECK (package_id = 'seed' OR billing_mode <> 'once_off');

COMMIT;
