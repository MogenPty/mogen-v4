-- DEVELOPMENT ONLY. Apply manually on Neon branch mogen-packages-dev
-- after 0006. DO NOT apply to production or set anything to 'published'.
-- Stores the approved PROPOSED pricing ladder; service entitlements, legal
-- terms and final go-live approval remain separate. All amounts are ZAR cents.
-- Existing Sprout values from 0005/0006 are checked and left untouched.
-- Existing option IDs ending -once-off for website plans are stable historical
-- identifiers: the actual billing_mode is managed_annual.
BEGIN;

CREATE TEMP TABLE _mogen_proposed_prices (
  id text PRIMARY KEY,
  package_id text NOT NULL,
  billing_mode text NOT NULL,
  amount_cents integer NOT NULL,
  setup_fee_cents integer NOT NULL
) ON COMMIT DROP;

INSERT INTO _mogen_proposed_prices (id, package_id, billing_mode, amount_cents, setup_fee_cents)
VALUES
  ('seed-once-off',              'seed',       'once_off',        49900,    0),
  ('sprout-managed-monthly',     'sprout',     'managed_monthly', 19900,    0),
  ('sprout-once-off',            'sprout',     'managed_annual', 149900,    0),
  ('sprout-self-hosted',         'sprout',     'self_hosted',    179900,    0),
  ('seedling-managed-monthly',   'seedling',   'managed_monthly', 44900,  99900),
  ('seedling-once-off',          'seedling',   'managed_annual', 349900,  99900),
  ('seedling-self-hosted',       'seedling',   'self_hosted',    549900,    0),
  ('vegetative-managed-monthly', 'vegetative','managed_monthly', 79900, 199900),
  ('vegetative-once-off',        'vegetative','managed_annual', 649900, 199900),
  ('vegetative-self-hosted',     'vegetative','self_hosted',    999900,    0),
  ('budding-managed-monthly',    'budding',    'managed_monthly',119900, 299900),
  ('budding-once-off',           'budding',    'managed_annual', 999900, 299900),
  ('budding-self-hosted',        'budding',    'self_hosted',   1499900,    0),
  ('flowering-managed-monthly',  'flowering',  'managed_monthly',179900, 499900),
  ('flowering-once-off',         'flowering',  'managed_annual',1499900, 499900),
  ('flowering-self-hosted',      'flowering',  'self_hosted',   2299900,    0);

DO $$
BEGIN
  IF (SELECT count(*) FROM _mogen_proposed_prices) <> 16 THEN
    RAISE EXCEPTION 'Pricing matrix must contain exactly 16 options.';
  END IF;
  IF EXISTS (
    SELECT 1 FROM _mogen_proposed_prices p
    LEFT JOIN public.web_package_prices w ON w.id = p.id
    WHERE w.id IS NULL OR w.package_id <> p.package_id
      OR w.billing_mode <> p.billing_mode OR w.status <> 'draft'
      OR w.currency <> 'ZAR'
      OR (w.amount_cents IS NOT NULL AND w.amount_cents <> p.amount_cents)
      OR (w.setup_fee_cents IS NOT NULL AND w.setup_fee_cents <> p.setup_fee_cents)
      OR w.effective_from IS NOT NULL OR w.effective_until IS NOT NULL
  ) THEN
    RAISE EXCEPTION 'Existing option is missing, published, dated, or has conflicting terms; aborting without writes.';
  END IF;
  IF EXISTS (
    SELECT 1 FROM public.web_package_prices w
    WHERE w.package_id = 'ripening' AND w.status = 'published'
  ) THEN
    RAISE EXCEPTION 'Ripening contains published prices; review before applying.';
  END IF;
  IF EXISTS (
    SELECT 1 FROM public.web_package_prices w
    WHERE w.package_id = 'seed' AND w.billing_mode <> 'once_off'
  ) THEN
    RAISE EXCEPTION 'Seed has unexpected non-once-off records.';
  END IF;
END $$;

-- Sprout's verified monthly/annual/self-hosted rows are intentionally untouched.
-- All other prices remain drafts; additional payment/hosting terms are unapproved.
UPDATE public.web_package_prices w
SET amount_cents = p.amount_cents,
    setup_fee_cents = p.setup_fee_cents,
    notes = concat('DRAFT PRICING APPROVED FOR DEVELOPMENT ONLY. ',
      'Commercial scope, entitlements and contract terms require final approval before publication. ',
      'Price amount recurs ', CASE WHEN p.billing_mode = 'managed_monthly'
        THEN 'monthly.' WHEN p.billing_mode = 'managed_annual'
        THEN 'annually.' ELSE 'once per project.' END),
    updated_at = now()
FROM _mogen_proposed_prices p
WHERE w.id = p.id
  AND p.package_id <> 'sprout'
  AND w.status = 'draft';

-- Guardrail: all expected records must remain drafts.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM _mogen_proposed_prices p
    JOIN public.web_package_prices w ON w.id = p.id
    WHERE w.status <> 'draft' OR w.amount_cents <> p.amount_cents
      OR w.setup_fee_cents <> p.setup_fee_cents
  ) THEN
    RAISE EXCEPTION 'Draft pricing postcondition failed; transaction rolled back.';
  END IF;
END $$;
COMMIT;
