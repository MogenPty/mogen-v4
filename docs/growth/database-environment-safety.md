# Database environment safety

Mogen uses separate Neon development and production targets. Database selection must be explicit and fail closed.

## Files

- `.env.development.local`: local development credentials and `MOGEN_DATABASE_ENV=development`.
- `.env.production.migration.local`: temporary local production migration credentials. Create only for a reviewed production migration and remove after use.
- Vercel Preview variables: development or preview Neon branch only.
- Vercel Production variables: production Neon database only.
- `.env`: do not use for database credentials. Next.js treats it as a fallback in every environment.

Both local database files are ignored by Git. Every file must define:

```dotenv
DATABASE_URL=postgresql://...
MOGEN_DATABASE_ENV=development
```

The environment must match the requested target. The hostname inside `DATABASE_URL` must match the committed, non-secret allowlist in `scripts/lib/database-targets.mjs`; changing the secret file alone cannot redirect a command to an unapproved database.

## Commands

```powershell
pnpm db:dev:inspect
pnpm db:dev:verify
pnpm build:dev
pnpm db:prod:inspect
pnpm db:prod:bootstrap
pnpm db:prod:verify
```

There is intentionally no generic database verification or migration command. Production commands never fall back to development credentials, and development commands never load the production migration file.

Use `pnpm build:dev` for a local production-mode Next.js build against development credentials. Plain `pnpm build` intentionally does not load `.env.development.local`; it represents the deployment build and therefore requires environment variables from the deployment platform.

`drizzle.config.ts` is development-only. It loads `.env.development.local` and refuses any target other than development. The existing production catalogue rollout remains a reviewed manual migration because the historical SQL files do not yet have a Drizzle Kit journal baseline.

## Production migration sequence

1. Snapshot the production Neon branch.
2. Create `.env.production.migration.local` only when migration review is complete.
3. Add the production `DATABASE_URL` and `MOGEN_DATABASE_ENV=production`. Confirm its host is the approved production host in `scripts/lib/database-targets.mjs`.
4. Run `pnpm db:prod:inspect`. The expected initial result is a verified production target with zero catalogue tables.
5. Run `pnpm db:prod:bootstrap` to review the exact migration plan. This dry run makes no database changes and excludes the unrelated private-document migration.
6. After explicit approval, run `pnpm db:prod:bootstrap -- --apply --confirm=bootstrap-empty-production-catalogue`. The command requires an empty production catalogue and applies the reviewed pricing chain atomically.
7. Run read-only production verification.
8. Configure the same production `DATABASE_URL` and `MOGEN_WEB_CATALOGUE_SOURCE=database` in the Vercel Production environment.
9. Remove `.env.production.migration.local` after the migration and retain the production credential only in trusted deployment secret stores.

Never copy the development connection string into the production environment, never use `drizzle-kit migrate` against the manually migrated production database, and never publish pricing until the production verification passes.
