-- PUBLICATION SWITCH — RUN MANUALLY ONLY AFTER FINAL LAUNCH REVIEW.
-- Apply on the actual production Neon database only with explicit approval
-- of the public descriptions, payment terms, privacy and promotion cutover.
-- Do NOT execute merely because the development pricing verification passed.
-- Before executing, ensure application env MOGEN_WEB_CATALOGUE_SOURCE=database
-- and DATABASE_URL targets this reviewed production Neon database.
-- Sprout, Seedling, Vegetative, Budding, Flowering pricing are fixed,
-- Seed is a one-time GBP/WhatsApp setup, Ripening is quotation only.
-- Intended as an idempotent, transactional launch switch.
BEGIN;

DO $$
DECLARE
  expected_ids text[] := ARRAY[
    'seed-once-off',
    'sprout-managed-monthly','sprout-once-off','sprout-self-hosted',
    'seedling-managed-monthly','seedling-once-off','seedling-self-hosted',
    'vegetative-managed-monthly','vegetative-once-off','vegetative-self-hosted',
    'budding-managed-monthly','budding-once-off','budding-self-hosted',
    'flowering-managed-monthly','flowering-once-off','flowering-self-hosted'
  ];
BEGIN
  IF (SELECT count(*) FROM public.web_packages WHERE id = ANY(ARRAY[
    'seed','sprout','seedling','vegetative','budding','flowering','ripening'
  ])) <> 7 THEN
    RAISE EXCEPTION 'Seven website packages are required before publishing.';
  END IF;
  IF (SELECT count(*) FROM public.web_location_offers WHERE location_slug IN ('maboloka','soshanguve','centurion')) <> 3 THEN
    RAISE EXCEPTION 'All three local recommendation configurations required.';
  END IF;
  IF (SELECT count(*) FROM public.web_package_prices WHERE id = ANY(expected_ids)) <> 16 THEN
    RAISE EXCEPTION 'All 16 commercial option IDs are required.';
  END IF;
  IF EXISTS (
    SELECT 1 FROM public.web_package_prices
    WHERE id = ANY(expected_ids)
      AND (amount_cents IS NULL OR amount_cents <= 0
        OR setup_fee_cents IS NULL OR setup_fee_cents < 0
        OR currency <> 'ZAR' OR status NOT IN ('draft','published'))
  ) THEN
    RAISE EXCEPTION 'Unpriced, conflicting or retired option; publication blocked.';
  END IF;
  IF EXISTS (SELECT 1 FROM public.web_package_prices
    WHERE package_id = 'ripening' AND status = 'published') THEN
    RAISE EXCEPTION 'Ripening must remain quote-only.';
  END IF;
  IF EXISTS (SELECT 1 FROM public.web_promotions
    WHERE status = 'published' AND (starts_at IS NULL OR starts_at <= now())
      AND (ends_at IS NULL OR ends_at > now())) THEN
    RAISE EXCEPTION 'Active legacy database promotion detected. Review before launch.';
  END IF;
END $$;

UPDATE public.web_packages
SET status = 'published', updated_at = now()
WHERE id IN ('seed','sprout','seedling','vegetative','budding','flowering','ripening')
  AND status = 'draft';

UPDATE public.web_package_prices
SET status = 'published', updated_at = now()
WHERE id IN (
  'seed-once-off',
  'sprout-managed-monthly','sprout-once-off','sprout-self-hosted',
  'seedling-managed-monthly','seedling-once-off','seedling-self-hosted',
  'vegetative-managed-monthly','vegetative-once-off','vegetative-self-hosted',
  'budding-managed-monthly','budding-once-off','budding-self-hosted',
  'flowering-managed-monthly','flowering-once-off','flowering-self-hosted'
) AND status = 'draft';

DO $$
BEGIN
  IF (SELECT count(*) FROM public.web_packages WHERE status = 'published' AND stage BETWEEN 1 AND 7) <> 7 OR
     (SELECT count(*) FROM public.web_package_prices WHERE status = 'published' AND package_id <> 'ripening') <> 16 THEN
    RAISE EXCEPTION 'Publication postcondition failed; entire transaction rolled back.';
  END IF;
END $$;
COMMIT;
