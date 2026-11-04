# Private SEO Tools, Learning Materials and Monorepo — Architecture Proposal
Status: discovery-first, not approved conversion or integration.

## Critical privacy distinction
`docs/growth/*.md` files in this **public GitHub repository** are not indexed website pages unless explicitly served, but they ARE publicly readable on GitHub and can be indexed by search engines through GitHub. They are not confidential. Never put passwords, client records, API keys, internal revenue figures or confidential methods here. For genuinely private study notes, use a separate **private repository** or a private database/object store.

## Preferred deployment architecture
- Public `www.mogen.co.za`: minimal fast, indexable conversion-first site.
- Private `ops.mogen.co.za` (name illustrative): authentication, RBAC, audit logs, customer/project tenancy and background jobs. Deploy separately even if kept in same monorepo.
- Internal tools `CrawlSEO` and `OpenSEO`: separate isolated worker/services or CLI integrations via ports/adapters, subject to licence and runtime review. No assumption they run natively as Next.js components.
- External API and Google Search Console integration: server-side credentials, scoped tokens and quotas; avoid scraping Google in a way that breaches terms.

## Monorepo migration (optional; not P0)
```
apps/
  web/             # public marketing website (existing Next.js app)
  ops/             # authenticated Next.js control plane
packages/
  ui/              # shared vetted UI components
  domain/          # packages, promotions, lead and SEO result types
  integrations/    # adapter contracts only, then safe implementations
workers/
  seo/             # isolated crawlers and jobs as technology permits
docs/
  growth/          # non-confidential planning
```
The repo has `pnpm-workspace.yaml` but is currently one web app. Conversion involves Vercel root-directory, env, Next build, TS aliases, article generation, CI, authentication and release considerations. Do not move folders until these dependencies are mapped.

## Access security
- Authenticated access **before** any private page is rendered, including route handlers, JSON, reports and file downloads; use server-side authorisation for admin/moderator/analyst roles.
- Use current existing admin/auth architecture when suitable; avoid introducing another auth package casually.
- HTTPS, secure cookies, CSRF protections as applicable, rate limits, MFA for admins if supported, bounded job execution, allowlist target hosts to prevent SSRF, no client-accessible service API keys.
- Login walls are necessary but not sufficient for privacy if the repo is public or storage endpoints leak documents. Noindex is advisory and not authentication.
- Schedule crawling off the public request path; avoid consuming Vercel request timeouts. Multi-tenant isolation and queue costs to be scoped before production.

## Fork evaluation checklist
Identify exact repository URLs, tags and licenses of both CrawlSEO and OpenSEO forks; map legal obligations, dependencies, persistent stores, web/crawler runtimes, auth assumptions, API surface, scheduling and host requirements. Start as external adapters or worker processes, not merged source trees. The main website must remain independently deployable.

## Risk
Technical platform development is potentially a distraction from finding customers. Limit the first iteration to a private GSC/lead dashboard and evidence collection; delay the monorepo until demand or integration proves it worthwhile.
