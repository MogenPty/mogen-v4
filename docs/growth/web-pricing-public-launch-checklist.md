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
