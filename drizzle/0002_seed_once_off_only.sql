-- Additive, DEVELOPMENT-ONLY business rule for Seed.
-- Seed is a one-off Google Business Profile/WhatsApp Business setup, not WaaS.
-- Charge separately for later fixes; no managed monthly or self-hosted option.
-- If old development data violates the rule, review/retire it first.
BEGIN;
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'web_package_prices_seed_once_off_check'
      AND conrelid = 'public.web_package_prices'::regclass
  ) THEN
    ALTER TABLE public.web_package_prices
      ADD CONSTRAINT web_package_prices_seed_once_off_check
      CHECK (package_id <> 'seed' OR billing_mode = 'once_off');
  END IF;
END $$;
COMMIT;
