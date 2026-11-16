# Database redirect management

**Status**: In Progress

## Summary

Mogen will manage exact, terminal segment, and terminal catch all redirects in PostgreSQL without requiring a deployment. The current Next.js redirect inventory will be seeded into the database, verified, and then disabled in `next.config.ts` so database rules have one clear authority. The first release reuses Neon, Drizzle, Better Auth, and the existing site theme controls.

## Requirements

**User stories**:

1. As an administrator, I can create, edit, test, disable, delete, import, export, and audit redirect and gone rules.
2. As a visitor or crawler, I receive the configured HTTP response without client JavaScript.
3. As an administrator, I can inspect missing URL demand and create a reviewed redirect from it.
4. As an administrator, I can manage redirects from the same sidebar, theme, and accent system as the general site.

**Acceptance criteria**:

1. **AC-1**: Active exact, terminal segment, and terminal catch all rules return 301, 302, 307, or 308 with a same origin `Location` and preserve the request query by default.
2. **AC-2**: Disabled, expired, unsafe, protected, cyclic, chained, or unavailable rules fail open and do not override the application.
3. **AC-3**: The database enforces valid statuses, normalized paths, and one active source path.
4. **AC-4**: Verified allowlisted administrators can manage rules, and every mutation records an audit event.
5. **AC-5**: Promotion slug changes update the promotion and redirect history atomically, collapse older destinations to the current URL, and revalidate public pages.
6. **AC-6**: Current promotion canonical URLs, sitemap entries, and internal links use the latest slug.
7. **AC-7**: Every unique eligible missing public path is recorded, while repeat hits are asynchronously aggregated and rate limited without storing query strings, IP addresses, or raw personal data.
8. **AC-8**: Search Console CSV input is normalized, deduplicated, cross checked, and staged for administrator approval.
9. **AC-9**: Existing `next.config.ts` redirects are imported with equivalent status and wildcard behavior, verified through direct HTTP tests, then disabled in configuration so Proxy and the database are authoritative.
10. **AC-10**: Automated tests cover response codes, headers, normalization, safety, concurrency, rollback, authorization, imports, cache failure, canonical URLs, and sitemap agreement.
11. **AC-11**: The authenticated admin area uses a persistent left sidebar and the existing site theme and accent controls across desktop and mobile layouts.

## Decision

**Chosen option**: Extend the existing application with a PostgreSQL source of truth and a small bounded process cache.

The root `proxy.ts` composes redirect resolution with Rampify tracking. A generation row lets warm instances detect changes on a short interval and reload the active rule snapshot. No Redis or KV service is added at current scale.

## Feature design

**Data model**:

1. `redirect_rules` stores normalized exact, terminal segment, or terminal catch all sources, destination templates, response status, activity, ownership, expiry, entity association, query policy, and aggregate hits.
2. `redirect_history` stores immutable administrative change events and before and after snapshots. Its rule reference becomes null after deletion while the snapshots remain.
3. `gone_resource_rules` stores independent 410 rules.
4. `redirect_cache_state` stores the generation changed by every rule mutation.
5. `not_found_paths` stores privacy safe sampled aggregates and resolution state.
6. `search_console_imports` and `search_console_import_rows` store reviewed import batches and suggestions.

**Interfaces**:

1. Server actions provide authorized CRUD, state changes, tests, CSV operations, slug updates, and 404 resolution.
2. The root Proxy reads the cached active snapshot and returns redirects or 410 responses.
3. A public catch all route records unmatched paths with `waitUntil` and renders the existing not found page. Public dynamic routes call the same recorder immediately before `notFound()` so their misses are also captured.
4. The admin route group uses a shared layout with a left sidebar, mobile navigation, theme mode control, and accent control.

**Value sourcing**:

| Action | Value produced or displayed | Source |
|---|---|---|
| Resolve request | Normalized source | Decoded request pathname and the normalization rules in this spec |
| Resolve request | Response status and destination | Active redirect or gone rule snapshot |
| Resolve request | Final query string | Incoming request query when `preserve_query` is true |
| Manage rule | Actor and timestamps | Verified Better Auth session and database clock |
| Manage rule | Audit before and after state | Row read in the same transaction and validated mutation input |
| Change promotion slug | Old and new canonical paths | Stored promotion slug and validated action input |
| Record missing path | Path, referrer origin and path, user agent class | Query free request headers and server classifier |
| Import CSV | Normalized source and suggestion | CSV URL pathname, current route inventory, entities, articles, and redirect history |
| Match pattern | Captured segment or suffix and final destination | A terminal `:segment` or `:path*` source capture substituted into the matching destination token |
| Render admin shell | Theme mode and accent | Existing `next-themes` state and the site `data-accent` convention |

**Key invariants**:

1. Source and destination are normalized absolute paths or use one terminal `:segment` or `:path*` token, not external URLs.
2. A source cannot equal or resolve through its destination.
3. A source cannot be an internal endpoint, protected route, static application route, or current canonical entity URL.
4. Automatic rules are associated with an entity and are not silently converted into manual rules.
5. Rule mutation and audit history are one database transaction.
6. Promotion mutation and automatic redirect creation are one database transaction.
7. The UI and CSV accept terminal `/*` notation and normalize it to stored `/:path*` notation. Exact rules win, then one segment rules, then catch all rules ordered by longest static prefix. Arbitrary regular expressions are not allowed.
8. A pattern destination may forward its matching token once or omit it to collapse all matched paths to one destination.
9. Every configured redirect is represented by an equivalent active database seed before its configured version is disabled.
10. If refresh fails, a warm instance keeps its last valid snapshot. `MOGEN_DATABASE_REDIRECTS_ENABLED=false` disables database routing as the rollback switch.

**Security model**:

Public reads expose only the response required for routing. All management reads and writes require the existing verified email allowlist. CSV input is size limited and parsed on the server. Queries, fragments, IP addresses, and raw referrer queries are not retained for 404 monitoring. Missing paths are rejected from telemetry when they exceed the length limit or resemble secrets or direct personal identifiers.

**Critical test scenarios**:

1. Each supported status and query policy verifies **AC-1**.
2. Cycles, chains, duplicate sources, expiry, disabled rules, protected paths, invalid encoding, and database failure verify **AC-2** and **AC-3**.
3. Unauthorized mutations and complete audit history verify **AC-4**.
4. Two successive and concurrent promotion slug changes plus rollback verify **AC-5** and **AC-6**.
5. Sampled aggregation and CSV approval flows verify **AC-7** and **AC-8**.
6. Real HTTP requests verify status, wildcard capture, and `Location`, and regression tests prove database parity before configuration is disabled, verifying **AC-9** and **AC-10**.
7. Sidebar navigation, mobile access, theme mode, accent changes, and keyboard focus verify **AC-11**.

## Build plan

1. Add schema, SQL migration, domain validation, and focused tests, satisfying **AC-2**, **AC-3**, and **AC-4**.
2. Add cached Proxy resolution and HTTP tests, satisfying **AC-1**, **AC-2**, and **AC-10**.
3. Add atomic promotion slug history and canonical fixes, satisfying **AC-5** and **AC-6**.
4. Add the shared administrator sidebar and theme controls, then the manager, CSV operations, and audit views, satisfying **AC-4**, **AC-8**, **AC-10**, and **AC-11**.
5. Add sampled 404 aggregation and resolution flow, satisfying **AC-7**.
6. Seed and verify all configured redirects, disable the configured redirect function, and produce the dry run, preview checks, rollout guide, and rollback guide, satisfying **AC-9** and **AC-10**.

## Consequences

**Positive**:

1. Redirect changes no longer require a deployment.
2. Existing infrastructure and authorization remain the operating model.
3. Existing SEO redirects can migrate gradually.

**Negative and tradeoffs**:

1. Cross instance cache invalidation is bounded by the generation check interval, not instantaneous.
2. Terminal wildcard rules add conflict analysis and ordering work beyond exact matching.
3. In memory repeat suppression can make 404 hit totals directional rather than billing grade analytics, while every first eligible path remains durable.

**Neutral**:

1. Existing configured redirects run before Proxy until the verified database parity step disables them.
2. Redis or KV can replace the generation cache later without changing rule semantics.

## Rationale

Reasoning and repository evidence are in [rationale.md](rationale.md).
