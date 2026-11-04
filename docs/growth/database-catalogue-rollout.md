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
