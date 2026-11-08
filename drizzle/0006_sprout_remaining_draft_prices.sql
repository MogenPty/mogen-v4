-- DEVELOPMENT ONLY. Apply manually to the verified Neon development branch after 0005.
-- Complete Sprout's three PROPOSED payment amounts; do not publish or
-- update production. No existing customer contract or production price changes.
-- One landing page, up to five sections.
-- Managed Monthly: R199/month, no setup fee, six-month minimum.
-- Managed Annually: R1,499/year, already staged in 0005, same managed service.
-- Self-Hosted: R1,799 one-time project fee, source-code and project-file handover.
BEGIN;

DO $$
BEGIN
  IF (SELECT COUNT(*) FROM public.web_package_prices
      WHERE (id = 'sprout-managed-monthly' AND package_id = 'sprout' AND billing_mode = 'managed_monthly')
         OR (id = 'sprout-self-hosted' AND package_id = 'sprout' AND billing_mode = 'self_hosted')) <> 2 THEN
    RAISE EXCEPTION 'Expected both Sprout draft option IDs/modes from 0004/0005 before applying 0006.';
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.web_package_prices
    WHERE id IN ('sprout-managed-monthly', 'sprout-self-hosted')
      AND (status <> 'draft'
        OR amount_cents IS NOT NULL AND amount_cents <>
           CASE id WHEN 'sprout-managed-monthly' THEN 19900 ELSE 179900 END
        OR setup_fee_cents IS NOT NULL AND setup_fee_cents <> 0
        OR (id = 'sprout-managed-monthly'
          AND minimum_months IS NOT NULL AND minimum_months <> 6)
        OR (id = 'sprout-self-hosted' AND minimum_months IS NOT NULL)
        OR initial_hosting_months IS NOT NULL
        OR deposit_percent IS NOT NULL)
  ) THEN
    RAISE EXCEPTION 'Existing Sprout terms/prices changed; inspect them before applying 0006.';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.web_package_prices
    WHERE id = 'sprout-once-off' AND package_id = 'sprout'
      AND billing_mode = 'managed_annual' AND status = 'draft'
      AND amount_cents = 149900 AND setup_fee_cents = 0 AND minimum_months = 12
  ) THEN
    RAISE EXCEPTION 'Apply and verify 0005 Sprout annual pricing before 0006.';
  END IF;
END $$;

UPDATE public.web_package_prices
SET amount_cents = 19900,
    setup_fee_cents = 0,
    minimum_months = 6,
    initial_hosting_months = NULL,
    deposit_percent = NULL,
    hosting_responsibility = 'mogen',
    maintenance_responsibility = 'mogen',
    notes = 'DRAFT PROPOSAL ONLY. Sprout one landing page (up to five sections). R199 monthly, zero setup fee, six-month minimum. Same managed hosting, maintenance and support as annual plan; exact service limits pending.',
    updated_at = now()
WHERE id = 'sprout-managed-monthly'
  AND package_id = 'sprout'
  AND billing_mode = 'managed_monthly'
  AND status = 'draft';

UPDATE public.web_package_prices
SET amount_cents = 179900,
    setup_fee_cents = 0,
    minimum_months = NULL,
    initial_hosting_months = NULL,
    deposit_percent = NULL,
    hosting_responsibility = 'customer',
    maintenance_responsibility = 'customer',
    handover_policy = 'Mogen delivers source code and project files after full payment. Hosting, deployment, ongoing maintenance and training are the customer responsibility or separately quoted.',
    notes = 'DRAFT PROPOSAL ONLY. Sprout one landing page (up to five sections). R1,799 one-time self-hosted project fee. Scope and handover acceptance pending.',
    updated_at = now()
WHERE id = 'sprout-self-hosted'
  AND package_id = 'sprout'
  AND billing_mode = 'self_hosted'
  AND status = 'draft';

COMMIT;
