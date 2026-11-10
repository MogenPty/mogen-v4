# Mogen Web Development pricing / acquisition funnel launch checklist

**Status: CODE STAGED, NOT LIVE.** Do not imply a pricing launch happened until production is reviewed and published.

## Offer ladder
| Package | Monthly | Annual | Self-hosted | Managed setup |
|---|---:|---:|---:|---:|
| Seed | — | — | R499 one-time business presence setup (no website) | — |
| Sprout | R199 | R1,499 | R1,799 | R0 |
| Seedling | R449 | R3,499 | R5,499 | R999 |
| Vegetative | R799 | R6,499 | R9,999 | R1,999 |
| Budding | R1,199 | R9,999 | R14,999 | R2,999 |
| Flowering | R1,799 | R14,999 | R22,999 | R4,999 |
| Ripening | Quote | Quote | Quote | Quote |

Seed's R499 is once-off GBP + WhatsApp setup, not a self-hosted website option. Monthly/annual are recurring. Location recommendations: Maboloka=Sprout, Soshanguve=Vegetative, Centurion=Flowering.

## Implemented on feature branch
- Web Development service already uses published DB prices, billing selector and contact CTA.
- Location cards now show published monthly price and managed setup fee, and carry selected priceOption into /contact.
- Seed one-time price is visible in Web Development catalogue and location callouts.
- Pricing directory now links prominently to Web Development prices and assessment.
- Manual publication switch: drizzle/0009_publish_web_catalogue_AFTER_APPROVAL.sql. It does NOT run automatically.

## Launch blockers / checks
1. Confirm production has reviewed schema, 7 packages, 3 location offers and the 16 priced options. Migrate after review; NEVER point production to the development branch mogen-packages-dev.
2. Verify all the features and exclusions in seeded data. Flowering currently promises a scoped commerce/booking/workflow foundation; Vegetative mentions scoped CMS. Either define the exact included boundaries or edit this copy before publishing. E-commerce, booking engines and bespoke workflows must not be unconditionally promised at fixed prices.
3. Confirm domain, email, maintenance and storage allowances for Seedling through Flowering. Agreed Sive-host cap is 15 GB maximum combined files+mail for standard tiers; it is not automatically an allowance for every tier. Paid upgrades are separate.
4. Review exact setup charges, deposits, subscriptions, cancellation, renewal, support, legal supplier identity and VAT wording before publication.
5. Find and retire conflicting legacy Sprout R299/R399 promotional text across homepage, promotion routes, questionnaire, conversion bar and metadata. The SQL's database promotion check does NOT detect static promotions in data/promotions.ts.
6. Enable MOGEN_WEB_CATALOGUE_SOURCE=database only after pointing production DATABASE_URL at the correct reviewed production Neon database.
7. Exercise /pricing, /services/web-development#pricing, /locations/maboloka, /locations/soshanguve, /locations/centurion and /contact?service=web-development&package=sprout&priceOption=sprout-managed-monthly.
8. Submit a real test enquiry with Turnstile; verify the package and price option in the outgoing email. Confirm mobile layout, analytics and operational inbox.
9. Run pnpm typecheck, pnpm build, pnpm exec vitest run lib/catalogue/commercial.test.ts, and contact/regression tests. These checks have NOT been executed on this feature branch by the assistant.
10. After explicit final approval: take backups, apply manual publication switch on production only, confirm 7 published packages and 16 published prices, then deploy and monitor.

## Funnel
Homepage/location/local SEO -> Web Development pricing -> billing choice -> package-aware contact -> Turnstile -> email -> human follow-up -> quotation / signed agreement / deposit.
Cloudflare pilot is explicitly deferred. Customer acquisition and public website conversion take priority.

## Funnel implementation update — 10 November 2026

- `components/mogen/web-catalogue-finder.tsx` now shows the published Managed Monthly starting price for every recommended fixed-price package, the associated managed setup fee, and a deep link into /contact carrying the validated priceOption identifier. Seed uses its Once-Off price; Ripening stays quotation-only.
- `app/page.tsx` and `components/mogen/service-detail.tsx` pass validated published price choices into the finder, with UTM attribution from the homepage/service page.
- Existing `data/promotions.ts` *already expires* all static web-development promotions when `MOGEN_WEB_CATALOGUE_SOURCE=database`. Historical promotion-detail pages can still display old prices labelled expired; check search engines/indexing and decide whether to redirect or noindex them. Do not show a stale promotion as currently available.
- As confirmed by the user, migration 0009 has been applied to `mogen-packages-dev`, and `scripts/verify-web-pricing-published.mjs` PASSED: 7 published development packages and 16 published development price options. This is not a production launch.
- The legacy `data/services.ts` still contains older Seed/Sprout/Vegetative pricing as a *fallback* when database mode is disabled. Keep the flag enabled in the **development preview environment** while testing, and do not change live production until a production DB has been prepared and verified.
- The developer must still run `pnpm typecheck`, `pnpm build`, and the targeted catalogue/contact regression tests for this new React wiring. No local tests were executed by the assistant. Vercel build/check status was pending at the time of the commit.

### Immediate QA sequence on local development branch

1. In `.env`, verify `DATABASE_URL` targets `mogen-packages-dev` and add `MOGEN_WEB_CATALOGUE_SOURCE=database` (server-only). Do not send secrets to chat or commit the .env.
2. Run `pnpm typecheck && pnpm build`; `pnpm exec vitest run lib/catalogue/commercial.test.ts lib/catalogue/recommendation.test.ts lib/catalogue/location-offer.test.ts lib/contact/catalogue-mail.test.ts`.
3. Start site and test home finder: first website should show Sprout R199/month; clicking CTA should open /contact with Sprout and `sprout-managed-monthly` populated.
4. Validate /services/web-development#pricing for payment switching; select annual/self-hosted and verify the selected option arrives in contact.
5. Validate location cards: Maboloka Sprout R199/month; Soshanguve Vegetative R799/month + R1,999 setup; Centurion Flowering R1,799/month + R4,999 setup. Seed displays R499 once-off.
6. Verify /promotions shows no currently active Seed/Sprout legacy web development offers; /promotions/mogen-sprout-first-100 must say expired.
7. Submit a test enquiry using configured Turnstile and verify incoming email includes correct package/mode. Check spam, errors and accessibility.
8. Complete commercial scope/legal/hosting and promotional archive review BEFORE copying migrations to production and enabling production flag.
