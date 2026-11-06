# Drizzle/Neon Web Package Rollout

Status: Database schema and seed migration prepared. Seven packages are DRAFT until their scopes, pricing and billing are approved; the present public site must not show these as purchasable offers automatically.

## Implementation
- `db/schema.ts`: web package and location offer models; IDs are stable public slugs.
- `drizzle/0000_web_catalogue.sql`: initial migration and seed rows. Run only on a development Neon branch or local PostgreSQL after inspecting SQL.
- `db/catalogue.ts`: server-only typed reads. Public listing only returns published rows.
- Monetary amounts intentionally NOT defined: package economics and billing types have not been approved. Display field currently says 'Request a quote'.
- No database credentials stored in the repository.

## Required deployment steps
1. Install dependencies with pnpm and commit regenerated lockfile (not performed by this PR): `pnpm add drizzle-orm @neondatabase/serverless server-only`; `pnpm add -D drizzle-kit dotenv`.
2. Set `DATABASE_URL` in local environment and in Vercel's server-only environment variables. Use a dedicated Neon development branch initially.
3. Use the SQL file with an audited migration runner or create a matching Drizzle Kit baseline snapshot before using `drizzle-kit migrate`. Do **not** apply the SQL manually and then rerun it as a migration without baselining.
4. Review package scope and pricing; mark records `published` only after approved package and promotion migration.
5. Connect service pricing, locations, questionnaire, promotional selectors, canonical enquiry validation and API submissions to the same database snapshot. This step is required before switching production to DB as authority. Avoid a mix of old static prices and new package IDs.
6. Add integration tests with local Postgres, seeded records, empty-state handling and pricing validation. Then deploy a preview and verify all location layouts and enquiry paths.
7. The repository currently uses Neon Auth in admin code. Better Auth is the intended future auth platform; migrate separately with data, sessions and role review. This package catalogue introduces no authentication.

## Cutover rule
Do not remove `data/packages.ts` or switch public package serving until all consumer paths have been updated and the old promotions retired/redefined. Keep a rollback branch and a database snapshot.

## Latest integration: location display behind feature gate
The three location detail pages now request `loadLocationWebOffer(slug)`. The database-backed package cards appear only when `MOGEN_WEB_CATALOGUE_SOURCE=database`, with a fully valid set of published offers; otherwise the existing location content remains as before.
- Keep this variable UNSET on production until the complete seven-stage catalogue, package pricing, forms and promotions agree.
- Because all seeded records begin as `draft`, setting the flag alone displays **nothing** new. Publishing must be deliberate.
- Do not expose draft records or old prices as if they were approved.
- New tests: `pnpm exec vitest run lib/catalogue/location-offer.test.ts`.
- REQUIRED: commit `package.json` and `pnpm-lock.yaml` from your local installation; current remote branch is missing dependencies.
- This is only the location-page integration, not the whole cutover. The Web Development service page, pricing and questionnaire still need database-backed integration and verified end-to-end lead submission.

## Catalogue website integration status (2026-11-05)
The code now includes feature-gated published-package reads on the Web Development service page, homepage package finder, three location pages, and contact route. The pricing directory reflects the six website stages in DB mode; old web FAQ entries are hidden in DB mode, as are obsolete web add-ons and old promotions are marked expired for historical reference.

The website finder in DB mode is a simpler initial selection flow than the legacy five-step questionnaire: it sends a visitor to the existing contact form to complete their enquiry. A multi-step redesign can follow after verifying conversion behaviour.

The package ID registry in `data/packages.ts` remains for backwards-compatible **synchronous enquiry identification**. The database is authoritative for catalogue scope, pricing labels, publication status and featured location choices while the feature flag is active. Later admin mutations must not depend on static package names.

### Read-only database verification
From the project root with `DATABASE_URL` configured against the development Neon branch:

```powershell
node scripts/verify-web-catalogue.mjs
pnpm exec vitest run lib/catalogue/location-offer.test.ts lib/catalogue/recommendation.test.ts
pnpm typecheck
pnpm lint
pnpm build
```

Do not enable `MOGEN_WEB_CATALOGUE_SOURCE=database` in production before confirming actual DB migrations, all seven published status values, approved commercial prices/quote labels, full contact-form smoke tests with Turnstile, and preview QA on all six site surfaces.

No DB write was executed from the GitHub connector; no remote test/build has been verified. The existing SQL file is not yet a Drizzle Kit migration snapshot/journal. Baselining must be done before using `drizzle-kit migrate` in automated deployments.

### Mandatory manual smoke tests (preview only)
- Desktop/mobile: /, /services/web-development, /locations/maboloka, /locations/soshanguve, /locations/centurion, /pricing, /faq, /promotions, /contact.
- Check feature flag OFF preserves existing three-tier site; flag ON draws only approved published DB rows and shows no old Seed/Sprout prices.
- Enter from a new package card / finder, confirm package and Web Development are preselected in /contact, submit through Turnstile to the real mail pipeline, confirm package in received email.
- Ensure expired old promotions cannot be claimed; no broken redirects or hidden active discounts.
- Test a draft package via manually typed /contact?package=... and direct POST: should not be treated as published.
- Monitor TTFB, errors and Google metadata; revalidate ISR caches on deployment/cutover.

### Pricing/schema limitation
`pricing_label` is a quote display string, not a normalized price/billing record. Before selling fixed prices or implementing the admin panel, add a versioned `package_prices` table (currency, decimal amount, cadence, setup fee, billing mode, effective dates, eligibility, published state) and a `location_campaigns` price override relation. Do not store monetary values as JavaScript floats.

## Enquiry hardening (November 2026)
When database mode is enabled, a submitted Web Development package ID must match a published `web_packages` row. After successful lookup, the server passes the *published database name* into the contact email formatter; the browser cannot supply a package name. In legacy mode the existing registry lookup remains unchanged. Run:
```powershell
pnpm exec vitest run lib/contact/catalogue-mail.test.ts lib/catalogue/location-offer.test.ts lib/catalogue/recommendation.test.ts
```
The test suite includes HTML escaping and service mismatch checks. These are source-level tests and still require local execution/confirmation.

### Pricing decisions needed before introducing paid offers
All currently published catalogue price *labels* are quotation placeholders, not approved commercial prices. Confirm for each of Seed, Sprout, Seedling, Vegetative, Budding, Flowering and Ripening:
- Whether the offering allows managed monthly, once-off (Mogen-managed), and/or self-hosted delivery;
- Initial setup and recurring fee per option (in ZAR), and whether VAT applies;
- Contract duration, deposit/payment schedule, hosting/domain/email inclusions, and handover rights;
- Add-on pricing, scoped exclusions and location-specific promotions.

Recommended next schema: `web_package_prices` as a one-to-many relationship with immutable package IDs, `billing_mode` enum, `currency` (ZAR), `amount_cents` integer, optional `setup_fee_cents`, `deposit_percent`, `minimum_months`, `status`, `effective_from` and `effective_until`, plus a separate campaign mapping table for location-specific discounts. Avoid numeric commercial prices until they are approved. Plan a tracked Drizzle migration rather than manually editing production tables.

## Commercial pricing and promotion schema — additive milestone (2026-11-06)

Approved commercial distinctions:
- **Managed Monthly**: ongoing Mogen hosting/maintenance/support subscription. Intended as the recurring revenue model. Its total revenue and margin depend on fees, operating costs, retention and churn.
- **Once-Off**: fixed-price Mogen-built and Mogen-deployed project; any initial hosting period is explicitly defined (`initial_hosting_months`) and hosting renewals are billed separately. No perpetual free hosting. Milestone/deposit terms are recorded per price option.
- **Self-Hosted**: build, source code and project files handed over after payment; client handles deployment, hosting and maintenance unless separately contracted.
- **Promotions**: independent campaigns targeting any number of individual price option IDs, potentially across different billing modes, each with its own fixed-cent or basis-point discount. Setup, project and recurring discounts have separate applicability.

Schema additions: `web_package_prices`, `web_promotions`, and `web_promotion_prices` in `db/schema.ts`. Commercial amounts use *integer ZAR cents*, never floating-point Rand. A null amount is intentionally unapproved, not zero. Promotions can have an optional location filter and campaign customer limit; enforcement of redemption limits and eligibility remains future work.

**Important**: These are database infrastructure changes only. No customer-facing fixed-price display, discount, checkout or subscription billing is enabled by this milestone. The old `pricing_label` remains a quotation placeholder until commercial options are approved and a controlled cutover is implemented. Admin/auth/payment provider design remains separate.

### Manual development-only migration

1. Confirm that `DATABASE_URL` points to the dedicated Neon development branch; back up/snapshot that branch first.
2. Open `drizzle/0001_web_commercial_options.sql` and inspect it.
3. Execute that file **once** using the Neon SQL Editor against the confirmed development branch. It creates tables/indexes/constraints but inserts no rows.
4. Verify read-only:

```powershell
node scripts/verify-web-catalogue.mjs
node scripts/verify-web-commercial.mjs
pnpm exec vitest run lib/catalogue/commercial.test.ts lib/catalogue/location-offer.test.ts lib/catalogue/recommendation.test.ts lib/contact/catalogue-mail.test.ts
pnpm typecheck
pnpm lint
pnpm build
```

The initial catalogue SQL was manually applied; there is still **no Drizzle Kit migration journal/snapshot**. Do not run `drizzle-kit migrate` on an existing Neon branch until baseline reconciliation is designed and tested. Also do not copy dev credentials or activate `MOGEN_WEB_CATALOGUE_SOURCE=database` on production during this step.

### Commercial approval gate
Before entering publishable rows, decide every package's eligible billing modes, prices in ZAR, setup fees, deposit rules, minimum terms, defined Once-Off hosting duration and renewals, VAT treatment, included hosting/email/domain/support, source-code handover and additional services. Ripening can remain quotation-only. Do not rely on a percentage discount alone for activation: enforce promotion dates, location, status, eligibility, maximum customers and future promotion stacking rules at offer and checkout time. No paid price should be shown until those controls exist.

## Public payment selector — feature-gated integration (2026-11-06)

The Web Development catalogue now accepts *published, effective and approved* `web_package_prices` rows (see `lib/catalogue/server.ts`). The package card only shows a payment selector when at least one eligible option has a valid integer-cent amount. Otherwise it remains a quotation-only card. No unapproved prices are seeded, and `MOGEN_WEB_CATALOGUE_SOURCE` remains opt-in.

The selector shows Managed Monthly, Once-Off and/or Self-Hosted only when those billing modes have eligible published price rows for that specific package. Price display includes setup fee, minimum term, deposit, initial hosting term and handover policy when relevant. Amounts are shown in ZAR. Seed is still a separate no-website offering; the finder and location offers remain package-based until a later commercial design review.

The selector generates a `/contact?service=web-development&package=<id>&priceOption=<id>` link. The contact route resolves and confirms the selected package and the price option are published, related, effective and priced, then includes the server-generated billing mode label in the enquiry email. A client-provided mode name is never trusted. Changing the service clears the stored price selection.

Commercial promotions remain independent of billing options; no promotion prices are applied in the public selector yet, because redemption limits, eligibility and stacking still need enforcement. No payment or purchase takes place.

### Tests / smoke checks
```powershell
pnpm exec vitest run lib/catalogue/commercial.test.ts lib/contact/catalogue-mail.test.ts lib/catalogue/location-offer.test.ts lib/catalogue/recommendation.test.ts
pnpm typecheck
pnpm lint
pnpm build
```
Confirm that an unpriced catalogue renders the quote button, an approved test payment option renders a selector on the development branch only, its contact link preselects the package and payment mode, and successful test mail contains the selected billing mode. Verify direct submission of an expired, draft or cross-package `priceOption` is rejected with HTTP 400. Do not publish a fixed Rand amount until commercial approval.

## Contact package recovery and Seed billing (November 2026)

The contact form now has an editable **Package of interest** selector that lists only packages belonging to the selected service. When database catalogue mode is enabled, Web Development choices are loaded from published Neon `web_packages` rows; other services use their existing registry. The form remembers each service's last valid package selection and restores it when the visitor switches back. The initial query-string selection is remembered too. Changing package clears any old payment-option ID to avoid mismatches; changing service temporarily clears the active package and billing option, while retaining each service's last selection in client-side form memory. No package is submitted under the wrong service.

Business decision: **Seed is Once-Off only.** No Managed Monthly and no Self-Hosted Seed offer; later support, corrections or fixes are separately quoted. Enforced by `isPublicWebPrice` and the additive development-only SQL constraint `drizzle/0002_seed_once_off_only.sql`.

Development setup: apply `drizzle/0002_seed_once_off_only.sql` **only** on the confirmed Neon development branch after checking for any old incompatible Seed options. This migration adds a DB constraint; it does not change a price, seed an offer or alter production data. Continue to avoid `drizzle-kit migrate` until a baseline journal exists.

Regression commands:
```powershell
pnpm exec vitest run lib/contact/package-selection.test.ts lib/catalogue/commercial.test.ts lib/contact/catalogue-mail.test.ts
pnpm typecheck
pnpm build
```

Browser smoke test: open `/contact?service=web-development&package=sprout`, switch Web Development → SEO → Web Development, and verify Sprout returns. Change package to Seedling; switch SEO and back; verify Seedling is retained (not reset to the original URL's Sprout). Choose SEO Scale, then return to Web Development, then SEO and verify each service retains its own package. Try selecting no package, and verify the cleared value stays cleared. Confirm an unpublished Web Development package never appears when Neon catalogue mode is enabled. Submit a normal test enquiry and verify the newly selected package appears correctly.

## Unpriced commercial-option templates (November 2026)

The development-only `drizzle/0003_seed_not_applicable_responsibilities.sql` migration corrects a modelling flaw: Seed does not include a website, so its hosting and maintenance responsibilities must be `not_applicable` rather than `mogen`. It replaces the relevant database CHECK constraints. **Existing conflicting Seed rows cause the migration to fail** instead of silently changing them; inspect and resolve those records before retrying.

After applying 0003, `drizzle/0004_draft_web_payment_options.sql` adds **16 draft, unpriced option templates** using stable identifiers and `ON CONFLICT DO NOTHING` (safe to rerun without overwriting edited records):
- Seed: Once-Off only, no website hosting or monthly subscription; later changes are individually quoted.
- Sprout, Seedling, Vegetative, Budding, Flowering: Managed Monthly, Once-Off and Self-Hosted (three alternatives per package).
- Ripening: custom quotation only; no fixed-price templates until project scoping is agreed.

Every inserted option has status `draft`, NULL monetary amounts, NULL minimum term and NULL initial hosting duration. The description and handover text are provisional, not approved customer terms. No promotion rows or public pricing are introduced, and no existing rows are updated. These templates should be reviewed in Neon development before any commercial approval.

**Migration order, only in a verified Neon development branch:** 0001 -> 0002 -> 0003 -> 0004 (apply only unapplied steps, inspect SQL first). Do not use `drizzle-kit migrate` without a journal/snapshot baseline.

Read-only verification:
```powershell
node scripts/verify-web-pricing-drafts.mjs
node scripts/verify-web-commercial.mjs
pnpm exec vitest run lib/catalogue/commercial.test.ts
pnpm typecheck
pnpm build
```

Next decisions for each option: approved base/project/monthly amount in ZAR, applicable setup fee, VAT presentation, deposits, minimum commitment, Once-Off hosting inclusion/renewal, domain/email support, maintenance SLA, source-code ownership and exit/transfer terms. Once the commercial approvals are settled, add controlled validation and publish workflow; do not simply change a draft row's status in production.
