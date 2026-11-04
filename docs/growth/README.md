# Mogen Web Development Growth Programme
Status: PROPOSED — decision record, not deployed functionality. Date: 2026-11-04.

## North star
Grow **qualified Web Development enquiries and paying customers**, not audit scores or raw article counts. SEO is a supporting service.

## Implementation order
1. **Measurement and technical safety**: record GSC baseline (non-brand queries), confirm old domain/archive status, fix indexing/canonical/redirect issues only when evidenced, instrument lead events with consent/privacy review.
2. **Commercial focus**: retain the current 3 web packages as purchasable offers while designing a 7-stage roadmap; test location-specific feature order and messaging without changing approved prices.
3. **Search growth**: keyword/SERP research around buyer phrases, web-development landing pages, internal linking, actual proof and enquiry path; treat changes as logged experiments.
4. **Internal tooling**: private documentation and admin dashboard; evaluate CrawlSEO/OpenSEO as isolated services; monorepo after feasibility assessment, never prerequisite for growth.

## Repository observations (main at ea1da9ac, read 2026-11-04)
- `data/packages.ts`: Seed/Sprout/Vegetative plus other services' package IDs. Package registry is resolution only.
- `data/promotions.ts` and `data/campaigns.ts`: existing promotion/attribution separation; avoid second source of truth.
- `data/locations.ts`: Maboloka, Soshanguve, Centurion physical office entries.
- `app/robots.ts`: currently emits allow-all and production sitemap for all deployments; comment explicitly anticipates stricter staging isolation. A canonical is NOT a substitute for deployment protection.
- `app/sitemap.ts`: currently includes static routes, articles, and public promotions in one generated sitemap.
- `next.config.ts`: legacy redirects including `/portfolio` to `/success-stories`; check consistency with current desired restored portfolio before any edit.
- `pnpm-workspace.yaml` exists but currently configures build allowances only; it does not establish app packages.
- Admin/auth route groups and `@neondatabase/auth` dependency already exist; inspect access controls before choosing a new auth system.
- No private archive repository was provided. Changes to `web.mogen.co.za` require its own repo/project and separate deployment approval.

## Required verification
- User: GSC page-indexing overview + URL inspection of production home and Web Development page (2 screenshots maximum). Separately, for archive indexing, inspect GSC Domain property if available; use passive evidence first.
- Engineer: verify HEAD/GET, canonical, redirect chain, archive robots/noindex, staging exposure, Vercel mapping, sitemap, page-to-query mapping, consent and enquiry analytics.
- Use a versioned migration date from Vercel history; do not assume one.

## Stop/go
No production redirect deletion, archive decommission, price changes, rebranding, monorepo conversion, or tool integration without separate reviewed PR and rollback plan.
