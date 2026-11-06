-- Development branch only. Run after 0001 and 0002.
-- Seed sells a one-off GBP/WhatsApp setup: no website hosting/maintenance.
-- Preserve existing commercial rows; reject any conflicting ones rather than silently rewriting.
BEGIN;
ALTER TABLE public.web_package_prices DROP CONSTRAINT IF EXISTS web_package_prices_responsibility_check;
ALTER TABLE public.web_package_prices ADD CONSTRAINT web_package_prices_responsibility_check
 CHECK (hosting_responsibility IN ('mogen', 'customer', 'not_applicable')
        AND maintenance_responsibility IN ('mogen', 'customer', 'not_applicable'));
ALTER TABLE public.web_package_prices DROP CONSTRAINT IF EXISTS web_package_prices_mode_responsibility_check;
ALTER TABLE public.web_package_prices ADD CONSTRAINT web_package_prices_mode_responsibility_check
 CHECK (
   (billing_mode <> 'managed_monthly' OR (hosting_responsibility = 'mogen' AND maintenance_responsibility = 'mogen'))
   AND (billing_mode <> 'self_hosted' OR (hosting_responsibility = 'customer' AND maintenance_responsibility = 'customer'))
   AND (billing_mode <> 'once_off' OR (
     (package_id = 'seed' AND hosting_responsibility = 'not_applicable' AND maintenance_responsibility = 'not_applicable')
     OR (package_id <> 'seed' AND hosting_responsibility = 'mogen' AND maintenance_responsibility <> 'not_applicable')
   ))
 );
COMMIT;
