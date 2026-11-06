-- DEVELOPMENT ONLY: commercial option templates, no approved prices or promotions.
-- Run after 0003. Safe to rerun: stable IDs and ON CONFLICT DO NOTHING.
-- Drafts deliberately have NULL amount_cents and NULL setup_fee_cents.
-- Ripening remains a custom quotation without fixed price rows.
-- Confirm DATABASE_URL/Neon SQL Editor points to development, never production.
BEGIN;

INSERT INTO public.web_package_prices
  (id, package_id, billing_mode, currency, amount_cents, setup_fee_cents,
   deposit_percent, minimum_months, initial_hosting_months,
   hosting_responsibility, maintenance_responsibility, handover_policy, notes, status)
VALUES (
  'seed-once-off', 'seed', 'once_off', 'ZAR', NULL, NULL,
  NULL, NULL, NULL,
  'not_applicable', 'not_applicable',
  'One-time GBP/WhatsApp setup. Future fixes quoted separately.',
  'DRAFT TEMPLATE ONLY. No website, no hosting, no subscription. Price and deliverables subject to approval.',
  'draft'
)
ON CONFLICT (id) DO NOTHING;

WITH offerings(package_id) AS (
  VALUES ('sprout'), ('seedling'), ('vegetative'), ('budding'), ('flowering')
), variants(billing_mode, hosting_responsibility, maintenance_responsibility, handover_policy, notes) AS (
  VALUES
    ('managed_monthly', 'mogen', 'mogen',
     'Managed subscription; source-code ownership and termination terms require approval.',
     'DRAFT TEMPLATE. Continuous monthly hosting/maintenance, no term or fee approved.'),
    ('once_off', 'mogen', 'customer',
     'Mogen deploys the project; initial hosting duration, renewals, and handover rights require approval.',
     'DRAFT TEMPLATE. Fixed project fee, deposit and hosting duration not yet approved.'),
    ('self_hosted', 'customer', 'customer',
     'Source code and project files handed over after full payment; customer handles hosting and maintenance.',
     'DRAFT TEMPLATE. Deployment/training outside scope unless quoted.')
)
INSERT INTO public.web_package_prices
  (id, package_id, billing_mode, currency, amount_cents, setup_fee_cents,
   deposit_percent, minimum_months, initial_hosting_months,
   hosting_responsibility, maintenance_responsibility, handover_policy, notes, status)
SELECT o.package_id || '-' || replace(v.billing_mode, '_', '-'), o.package_id, v.billing_mode,
       'ZAR', NULL, NULL, NULL, NULL, NULL,
       v.hosting_responsibility, v.maintenance_responsibility,
       v.handover_policy, v.notes, 'draft'
FROM offerings o CROSS JOIN variants v
ON CONFLICT (id) DO NOTHING;

COMMIT;
