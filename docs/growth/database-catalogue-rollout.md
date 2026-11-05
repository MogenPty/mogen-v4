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
