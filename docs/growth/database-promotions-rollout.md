# Database-driven Mogen promotions (development rollout)

**Status:** Code committed on `feat/neon-drizzle-web-catalogue`. Production must remain unchanged.

## Architecture

- **Source of truth:** Neon `web_promotions` (campaign, dates, status, location, marketing text) + `web_promotion_prices` (targeted published pricing option, discount type, term).
- Web pages read a server-only projection through `lib/catalogue/promotions-server.ts`. When `MOGEN_WEB_CATALOGUE_SOURCE=database`, there is **no fallback** to old hardcoded promotions.
- A promotion can become public only when it has a valid slug, approved short description, CTA label and terms, a linked **published and public** price option, a **real nonzero valid discount**, and a single target package.
- `status=draft` and `status=archived` are never public; `status=scheduled` appears as coming soon, `status=active` appears active during its date window, `status=expired` is historical. Ending a campaign or reaching a customer cap requires an explicit update; caps are **not automatically counted**.
- Homepage featured offer, promotions directory, promotion detail page and contact preselection use database campaigns. An active DB promotion sends visitors to the contact form with server-validated package/billing choice and the promotion name in the enquiry message.
- A promotion on a location is identified in eligibility details; location-specific eligibility must be confirmed by staff.
- **Other Mogen services:** the current `web_promotions` table supports **Web Development campaigns**. SEO/Digital Marketing/Business Documentation promotions require a generic service-aware extension before using this table for them.

## Apply only in development

1. Pull the feature branch.
2. Ensure `.env` has `DATABASE_URL` pointing to the **mogen-packages-dev** branch.
3. Apply `drizzle/0010_web_promotion_content.sql` in the Neon development SQL Editor after 0009. It adds `slug`, `is_featured`, `sort_order` and structured `presentation` JSON. It **does not publish** or seed any promotions.
4. Verify existing approved package prices remain intact using `node --env-file=.env scripts/verify-web-pricing-published.mjs`.
5. Keep `MOGEN_WEB_CATALOGUE_SOURCE=database` for development preview only. New campaigns must be drafted and reviewed before `status='active'`.
6. Run `pnpm typecheck`, `pnpm build`, `pnpm exec vitest run lib/catalogue/promotion-projection.test.ts lib/catalogue/commercial.test.ts`. These checks have **not yet been run by the assistant**.
7. Test homepage featuring, /promotions, /promotions/[slug], CTA through /contact and test email before considering production deployment.

## Draft campaign example (illustrative only — do not publish without approval)

The example below uses a **hypothetical R50 reduction** from Sprout Managed Monthly's R199 rate for **3 months**. It is not a business-approved promotion. The default status is deliberately `draft` and will remain invisible publicly.

```sql
BEGIN;
INSERT INTO public.web_promotions
  (id, slug, name, description, status, starts_at, ends_at, location_slug,
   eligibility, maximum_customers, is_featured, sort_order, presentation)
VALUES (
  'sprout-example-draft',
  'sprout-example-draft',
  'Sprout Sample Campaign',
  'Example only: a hypothetical discount for demonstration.',
  'draft', NULL, NULL, NULL,
  'Subject to Mogen approval.', NULL, false, 100,
  jsonb_build_object(
    'shortDescription', 'Demo campaign — not yet available.',
    'ctaLabel', 'Ask about this offer',
    'terms', jsonb_build_array('Not valid until approved in writing.', 'Eligibility and scope are subject to review.'),
    'included', jsonb_build_array('Sprout landing page, subject to published package scope'),
    'eligibility', jsonb_build_array('Customer eligibility must be confirmed by Mogen')
  )
) ON CONFLICT (id) DO NOTHING;

INSERT INTO public.web_promotion_prices
  (promotion_id, package_price_id, applies_to, discount_kind,
   discount_amount_cents, discount_percent_bps, discounted_months)
VALUES ('sprout-example-draft', 'sprout-managed-monthly', 'recurring',
  'fixed', 5000, NULL, 3)
ON CONFLICT (promotion_id, package_price_id, applies_to) DO NOTHING;
COMMIT;
```

### Controlled activation

Only after approving campaign pricing, target payment option, dates, full terms, location eligibility, and fulfillment capacity:

```sql
-- Example: do not run for the demo above without actual commercial approval.
-- UPDATE public.web_promotions
-- SET status='active', starts_at=now(), ends_at=<approved exclusive-end timestamp>,
--     is_featured=true, updated_at=now()
-- WHERE id=<approved campaign id> AND status='draft';
```

Campaign pricing **must not** be duplicated in hardcoded TS arrays. The presentation JSON contains copy, never a price; the website calculates each discount from the published price + target row.

## QA scenarios

- No DB campaigns: /promotions shows an empty-state message; homepage shows no promotion feature. **This is intentional.**
- Draft campaign: absent from public pages; direct slug 404.
- Published promotion with unpublished/invalid pricing target: absent.
- Valid scheduled/active/expired promotion: status and CTA respond to effective dates. Expired promotions are not claimable.
- Featured active promotion: homepage and conversion CTAs use this campaign; unfeatured active offers remain in the index.
- Enquiry URL includes package ID, exact validated price option and promotion slug; contact prefill identifies the campaign. Turnstile + email delivery must be tested.
- Old Sprout R299 and Seed R99 hardcoded offers never reappear in database catalogue mode.

## Production launch

Migrate **0010** with the other reviewed SQL files against **production Neon**, then import only approved campaigns with correct statuses. Do not copy development-only test campaigns or expose the development database. Confirm migrations, price verification and end-to-end contact flow before enabling `MOGEN_WEB_CATALOGUE_SOURCE=database` in Vercel Production.
