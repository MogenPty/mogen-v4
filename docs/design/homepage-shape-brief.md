# Homepage Shape Brief

## 1. Job and Audience
- **Surface:** Public homepage (`/`) — Next.js App Router page at `app/(public)/page.tsx`
- **Visitor mode:** Persuade (primary), with Operate moments for promotion interaction
- **Audience:** South African SMB owners/decision-makers in Pretoria/Soshanguve/Maboloka/Brits/Centurion/Gauteng evaluating web development, SEO, or digital marketing services
- **Context:** Arrive via search, referral, or social; looking for credible local provider with transparent pricing and active offers
- **Primary need:** Understand Mogen's offer, see any active promotion, and convert via enquiry

## 2. Outcome and Proof
- **Primary action:** Submit enquiry form (routes to `/enquire` or inline modal) with package/promotion context pre-filled
- **Success:** Enquiry rate ↑; promotion-coded enquiries trackable in admin
- **Real evidence (DB-driven only):**
  - 7 package tiers: `seed` → `sprout` → `grow` → `bloom` → `thrive` → `harvest` → `ripening` (names from `data/packages.ts`, pricing from Neon)
  - Active promotion(s) from `data/promotions.ts` — discount %, target payment option, geo eligibility, max customers
  - Company identity: Mogen / Motsoane Global Enterprise (Pty) Ltd, contact details, `@MogenPTY` socials
- **No fabrication:** Zero testimonials, case studies, client logos, or benchmarks invented

## 3. Selected Direction
- **Visual authority:** Established DESIGN.md + `app/globals.css` tokens (semantic + brand tokens `catalyst`/`volt` for accents). Green default, orange alternative — both functional everywhere.
- **Structural thesis:** Editorial single-column flow with one decisive promotion card as the conversion hinge. Packages render as a scannable tier grid; services as a compact trio. Footer carries full NAP + socials.
- **Sequence:** Hero (brand-led) → Active Promotion Card → Package Tier Grid → Services Overview → Footer
- **Focal moment:** Promotion card — high-contrast `catalyst` background, clear discount claim, single CTA to enquiry with promo pre-selected
- **Implementation consequence:** `app/(public)/page.tsx` as ISR page (`revalidate=3600`), server components fetching from Neon via Drizzle; client-only enrichment for theme/accent toggle and enquiry modal

## 4. Scope and Boundaries
- **In scope:** Homepage layout, promotion card component, package tier cards, service trio, footer, enquiry integration point
- **Out of scope:** Admin surfaces, package detail pages, service detail pages, blog, portfolio, auth, checkout
- **Fidelity:** Production-ready Next.js page with real data, both themes, both accents, keyboard focus, narrow viewport
- **Anti-goals:** No marketing fluff, no fake trust signals, no carousel/slider, no parallax, no animation for animation's sake

## 5. States and Ranges
- **Promotion states:** None active → single active → multiple active (show newest/soonest-expiring first, max 1 in hero card, rest in overflow)
- **Package data:** 7 tiers always present; each shows name, one-line outcome, starting price (from DB), CTA
- **Services:** 3 fixed — Web Development, SEO, Digital Marketing — each with icon, 1-sentence promise, link to service page
- **Viewport ranges:** 320px → 1440px+; single column <768px, 2-col packages 768–1024px, 3–4 col >1024px
- **Theme/accent:** Light/dark × green/orange = 4 combos, all verified

## 6. Interaction and Layout
- **Hierarchy:** H1 (brand promise) → H2 (active promotion) → H2 (packages) → H2 (services) → Footer
- **Topology:** Linear scroll; promotion card anchors to enquiry with `href="#enquire?promo=<slug>"`
- **Responsiveness:** Admin-style sidebar patterns do not apply; public page uses fluid grid with `clamp()` spacing
- **Affordances:** Package cards — hover/focus lifts border to `catalyst`; promotion card — `catalyst` fill, white foreground; enquiry CTA — primary button pattern
- **Feedback:** Enquiry submit → toast + redirect to `/thank-you?promo=<slug>`; form validation inline
- **Transitions:** Theme/accent swap instant (CSS vars); no page transitions

## 7. Constraints and Open Decisions
- **Binding:** Next.js 15 App Router, Drizzle/Neon, Better Auth (enquiry only), `app/globals.css` tokens only, ISR `revalidate=3600`
- **Accessibility:** WCAG 2.1 AA — focus order, contrast, ARIA labels, `prefers-reduced-motion`
- **Localization:** English only; ZA number format (R1 234,56); dates DD/MM/YYYY
- **Reusable components:** `AdminCard` pattern adapted as `PublicCard`; `Button`, `Badge`, `Input` from `components/ui/*`
- **Open decisions:**
  1. Enquiry form: inline modal vs dedicated `/enquire` page (recommend modal for promotion context retention)
  2. Promotion card: single CTA "Enquire with this offer" vs dual "View details" + "Enquire" (recommend single)
  3. Package price display: "From R{X}" vs "R{X}/month" (depends on DB `payment_options` shape — resolve at implementation)
  4. Services links: route to `/services/web-dev` etc. (routes must exist or be created)

---

**Confirm or correct one item, then this brief is locked for implementation.**