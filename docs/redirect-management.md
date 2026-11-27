# Redirect management operations

## Architecture

`redirect_rules` and `gone_resource_rules` are the source of truth. The root
Next.js 16 `proxy.ts` resolves normalized incoming paths before rendering and
returns server-side 301, 302, 307, 308 or 410 responses. No client JavaScript is
involved.

Each warm application instance keeps a sorted in-process snapshot. It checks the
single `redirect_cache_state` generation at most every 15 seconds and reloads
only when that generation changes. Administrative writes update the rule,
append immutable history, and increment the generation in one database batch.
This is sufficient for current traffic and avoids introducing Redis/KV. If the
database is unavailable, a warm instance retains its last valid snapshot; a
cold instance safely continues the request without redirecting.

Rules are exact, one terminal segment (`/blog/:segment`, with `:slug` accepted
as input), or terminal catch-all (`/blog/:path*`, with `/blog/*` accepted as
input). Exact rules win over segment rules, which win over catch-alls. Query
strings are preserved by default. Destinations are same-origin paths only.

## Next.js precedence

Next.js `next.config.ts` redirects run before `proxy.ts`. The legacy block is
therefore commented out after its eleven rules were seeded by
`drizzle/0012_redirect_management.sql`. It remains in the file as a documented
rollback path until production parity is confirmed. Re-enabling it will override
database changes for those matching sources.

## Database rollout

Always inspect before applying. Migration commands reject pooled Neon URLs and
require an explicit target-specific confirmation.

```powershell
pnpm redirects:dev:inspect
pnpm redirects:dev:migrate -- --apply --confirm=apply-redirects-development

pnpm redirects:prod:inspect
pnpm redirects:prod:migrate -- --apply --confirm=apply-redirects-production
```

Production migration is intentionally not run by application startup. It was
applied and independently verified on 2026-11-17 before the reviewed build was
released. Future schema changes remain controlled pre-deployment steps.

Re-run the migration on development and production databases that already
applied 0012 to add the Brits location catch-all, legacy mobile app service
redirect, and legacy web development article redirect. Verify each added rule
over HTTP before relying on it. The seed refreshes the cache generation when
it changes a rule.

## Preview verification

1. Apply migration 0012 to the preview/development Neon branch.
2. Confirm seven redirect-management tables and all fourteen seeded rules.
3. Deploy with `MOGEN_DATABASE_REDIRECTS_ENABLED=true` (or omit it; enabled is
   the default) and a valid direct application `DATABASE_URL`.
4. Verify every seeded URL with `curl -I`, checking the exact status and
   `Location` header, including query preservation.
5. Create a temporary 307 rule in Admin, verify it over HTTP, disable it, and
   confirm the source returns its normal response within 15 seconds.
6. Test `/blog/example`, an encoded path, a trailing slash, and an unknown path.
7. Confirm the unknown path appears in **Admin → 404 monitor** without its query
   string and can be converted to a redirect.
8. Check the admin shell in light/dark and green/orange at mobile and desktop
   widths.

## 404 monitoring

Public 404s are written with `waitUntil`, never on the response-critical path.
Only normalized pathnames are stored; query strings are discarded and external
referrers are reduced to scheme and host. User agents are classified, not stored
verbatim. Repeated paths are aggregated at most once per minute per warm
instance, writes are capped during bursts, and records retain for 90 days.
Counts are operational samples rather than billing-grade analytics.

Never redirect unrelated missing pages to the homepage. Use 410 only when a
resource was intentionally removed and has no replacement.

## CSV and Search Console

Bulk redirect CSV requires `sourcePath,destinationPath`; optional columns are
`statusCode,preserveQuery,isActive,expiresAt,description`. The whole set is
validated for protected paths, duplicate sources, loops and chains before an
atomic batch is attempted.

Search Console exports are staged separately. Existing redirects and current
published pages produce no redirect proposal. A destination is suggested only
for an exact known article or promotion slug. An administrator must review the
suggestion in Redirect Manager and submit it before a rule is created.

## Rollback

Application rollback does not require deleting data:

1. Set `MOGEN_DATABASE_REDIRECTS_ENABLED=false`.
2. Uncomment the preserved `next.config.ts` redirect method. The feature flag
   does not restore config redirects by itself.
3. Redeploy the previous or rollback build.

Do not drop tables during incident response. They are inert when the proxy
feature flag is false and preserve rules, history and diagnostics for analysis.
After recovery, inspect the database and re-enable the proxy in preview first.

## Rollout report (2026-11-17)

- Found eleven hardcoded redirects; all have one-to-one database equivalents.
- Permanent Next.js redirects map to 308; the one temporary redirect maps to
  307, matching Next.js method-preserving behavior.
- Development and production migrations verified seven tables, 62 columns,
  13 constraints, 14 indexes, two cross-table exclusivity triggers and all
  eleven seeded active rules.
- Production migration completed before the reviewed proxy build was released.
- Existing config rules remain preserved as comments for rollback.
- Redis/KV is not justified at current scale; generation-polled local snapshots
  avoid a database lookup on ordinary page requests.
