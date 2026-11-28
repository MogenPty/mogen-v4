# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

Primary users are the Mogen internal operations team who manage published website packages, promotions, redirect rules and 404 monitoring via `/admin`. Secondary audiences are public visitors evaluating Mogen's services — potential clients in Pretoria/Soshanguve/Maboloka looking for websites, SEO and digital marketing.

## Product Purpose

Mogen sells three core services — Web Development, SEO, and Digital Marketing — to small-to-medium South African businesses. The product surface has two jobs: (1) persuade site visitors to enquire about a package or service, and (2) give internal staff a private catalogue-admin UI to publish/edit web-development tiers, promotions and search-engine redirects without touching SQL.

## Positioning

Neon-backed promotion lifecycle: approved pricing lives in a database, promotions go through draft → scheduled → active → expired states, and each campaign carries a target payment option, discount terms and geographic eligibility. A competitor copying this would need to replicate the full approval-and-expiration workflow plus the audit-ready database schema — not just a static brochure page.

## Operating Context

- **Admin** (`/admin`): internal ops workday; staff sign in via Better Auth, verify email against `MOGEN_ADMIN_EMAILS`, then manage seven package tiers, campaigns, organic-traffic redirects and 404 logs.
- **Public site**: Next.js ISR pages regenerated hourly (`revalidate=3600`) so promoted prices surface within roughly an hour of publication.
- **Staging** (`mogen-v4.vercel.app`) is used for verification before production deploys; the assistant is instructed never to touch the production database directly.
- Promotions are enquiry-based offers, not live checkout discounts — maximum customer counts and geo eligibility are manual checks.

## Capabilities and Constraints

Confirmed capabilities:
- Seven growth-stage web-development packages (`seed` through `ripening`) published per-tier with optional payment options.
- Three-page promotion lifecycle with server-side validation on publish (complete copy, real price reduction).
- Database-driven organic redirect rules and a monitored 404 log.
- Light/dark theme, green (default) and orange accents, keyboard focus, narrow viewports — all required on every screen.

Explicitly undecided:
- Specific brand assets beyond the canonical logo files already in `public/images/mogen/`.
- Pricing figures and tier copy — these live in the database and must be treated as verified facts when surfaced.
- Whether other services (SEO, digital-marketing) will receive their own Neon-backed catalogue extensions.

## Brand Commitments

- Name: "Mogen" (trading name); legal entity "Motsoane Global Enterprise (Pty) Ltd".
- Visual identity source of truth: `app/globals.css` tokens only. Semantic `background/card/foreground/muted/border/sidebar`, brand tokens `bone/ink/catalyst/store/seo/volt/obsidian/steel`.
- Public tone: precise, editorial, quietly industrial — compact uppercase labels, high-contrast typography, sturdy card surfaces, one decisive accent.
- Admin tone: operational side of the public brand, never a generic dashboard template.
- Canonical social profiles: Facebook, TikTok, X, Instagram, GitHub, LinkedIn — all under the handle `@MogenPTY`.
- Email: `info@mogen.co.za`; telephone: `+27 (0)71 863 1884` / `+27 76 520 7876`.
- Area served: Maboloka, Brits, North West, Soshanguve, Pretoria, Centurion, Gauteng, South Africa.
- Price range claim on hand: R99 – R32 000.
- Voice is plain English, no hype.

## Evidence on Hand

- `data/site.ts` — verified company name, contact details, address locality, social profiles.
- `data/packages.ts` — registered package identifiers and names (resolution-only registry).
- `data/services.ts`, `data/promotions.ts`, `data/portfolio.ts` — current copy and catalog data.
- `DESIGN.md` — incumbent visual direction extracted from existing UI.
- `app/globals.css` — authoritative token definitions for light, dark and both accents.
- `docs/growth/catalogue-admin-guide.md` — validated admin security model and operation steps.
- `drizzle/` — migration history reflecting confirmed database schema decisions.
- Absences to note: no separate style guide, no brand-manual PDF, no testimonial collection recorded. Future work must not fabricate testimonials, case studies or press citations.

## Product Principles

1. **The admin is operational, not decorative.** Precision beats expression on internal surfaces; brand lives in small controlled choices.
2. **Database is the source of truth for commerce.** Prices, promotions and payment options are mutable records, not hardcoded copy. Every public price must be traceable to a DB row.
3. **Green is default, orange is alternative.** Both accents must function everywhere; neither replaces the other permanently.
4. **Every screen supports keyboard, narrow width and both themes.** Accessibility is table-stakes, not a phase-two afterthought.
5. **No fabrication on proof claims.** Testimonials, case studies, client lists and benchmarks require user-supplied evidence — they are never invented by the design system.
