# Database redirect management rationale

## Context

Mogen has eleven code configured redirect rules and one root Proxy that tracks crawler traffic. Next.js runs configured redirects before Proxy and supports only one root Proxy. The new resolver must therefore compose with tracking, reproduce exact and wildcard behavior, and become the single active redirect authority after parity is verified.

The public catalogue is partly database backed. Promotions have public database slugs, packages use stable identifiers, services use static data, and articles use build generated MDX. Promotion slug history is the only current automatic database slug workflow.

Proxy is not intended for slow data fetching, and Next.js documents that fetch cache controls have no effect there. A database query on every page would be wasteful. The current traffic and rule count do not justify another infrastructure service.

## Options considered

### Fix only `next.config.ts`

This keeps routing simple but requires a deployment for every change and cannot provide management, audit, hit, or 404 workflows.

### Add a shared Redis or KV cache

This gives fast global invalidation but adds a provider, credentials, cost, failure mode, and operating burden before traffic demonstrates a need.

### Use PostgreSQL with a bounded local snapshot

This keeps Neon as the source of truth. A generation check limits database work, warm instances refresh after a short bound, and new instances load the current generation.

## Rationale

The PostgreSQL snapshot option meets the current scale with the fewest moving parts. The generation value makes stale behavior explicit and testable. Wildcards use only the existing terminal `:path*` form, which supports current rules without adding arbitrary regular expressions.

The rollout follows a strangler approach. Database rules run alongside existing configured rules, are verified in preview, and only then may selected exact rules be removed from configuration.

## Repository evidence

1. `proxy.ts` is the only effective Proxy and already performs asynchronous tracking.
2. `next.config.ts` contains ten permanent or temporary legacy rules, including wildcard paths.
3. `lib/admin/access.ts` is the established administrator guard.
4. `lib/admin/catalogue-actions.ts` is the established server action and revalidation pattern.
5. `db/schema.ts` and explicit SQL files in `drizzle/` define the migration convention.
6. `app/sitemap.ts` currently reads legacy promotions and must be aligned with database catalogue mode.

## Migration plan

**Strategy**: Strangler migration.

**Phases**:

1. Add empty tables and application code while configured redirects remain authoritative.
2. Import selected exact rules in disabled or dry run form and verify conflicts.
3. Enable database rules in preview and verify every configured rule against its database equivalent.
4. Disable the configured redirect function so Proxy becomes the one active redirect authority.
5. Roll out to production and retain the old inventory as commented rollback context for the first iteration.

**Rollback**: Disable database rules with an environment switch and restore the preserved configured redirect function in a rollback deployment.

**Risks**: A stale process snapshot can delay a change by the documented interval. A configured redirect can shadow a database rule. A promotion slug mutation must roll back if its redirect cannot be created.
