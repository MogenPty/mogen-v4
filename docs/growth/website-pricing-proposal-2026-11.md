# Mogen seven-package website pricing proposal — November 2026

STATUS: **PROPOSED, NOT APPROVED OR PUBLISHED**. All values in ZAR, no VAT charged while the actual supplier is not VAT-registered. Never set status=published or change production without explicit commercial approval.

| Package | Scope | Managed Monthly | Managed Annually (recurring/year) | Self-Hosted once-off | Managed setup fee |
|---|---|---:|---:|---:|---:|
| Seed | GBP + WhatsApp Business, no website; one-off only | — | — | — | — |
| Sprout | One landing page, 5 sections | 199 | 1499 | 1799 | 0 |
| Seedling | Up to 5 pages | 449 | 3499 | 5499 | 999 |
| Vegetative | Up to 10 pages | 799 | 6499 | 9999 | 1999 |
| Budding | Up to 15 pages | 1199 | 9999 | 14999 | 2999 |
| Flowering | Up to 25 pages | 1799 | 14999 | 22999 | 4999 |
| Ripening | Custom-scoped | Quote | Quote | Quote | Quote |

**Seed** separate proposed one-off price: R499 for GBP and WhatsApp setup, never a Self-Hosted website; price is NOT agreed.

**Already agreed Sprout only:** monthly R199, annual R1,499 recurring, self-hosted R1,799; initial six-month monthly commitment, 12-month annual billing cycle, no setup. Previously approved service spec applies.

**For Seedling–Flowering everything is illustrative**: setup fees, service limits, email count, hosting allocation, maintenance units, minimum commitments, page definitions, complexity caps, SEO, warranty and support still need approval. Larger builds must not be sold at fixed prices without a documented page/template and functionality scope. All websites exclude bespoke apps, transactions, portals, high-cost integrations and ecommerce unless explicitly quoted. Optional features and storage upgrades quoted separately. No unconditional timelines or support warranties.

## Sales positioning
- Maboloka: Sprout featured. Cards Sprout, Seedling, Vegetative, Need Larger?.
- Soshanguve: Vegetative featured. Cards Need Smaller?, Vegetative, Budding, Need Larger?.
- Centurion: Flowering featured. Cards Need Smaller?, Budding, Flowering, Ripening.
- Seed: separate callout in all three.
- Location determines recommendations, **not location-specific entitlement or hidden pricing**.

## Market checks (public advertised prices, verify before publication)
- Havealot Design Corp: landing R1,400; 5 pages R2,800; 10 pages R4,500; 15+ pages R7,500, once-off: https://www.designcorp.co.za/pricing
- Overflow Online: 1 page R2,499; 5 pages R6,999; 10 pages R10,999, first-year hosting: https://overflowonline.co.za/pricing/
- Clevex: about 6 pages R599/month or R5,500 once-off; 12 pages R899/month or R8,500 once-off: https://clevex.co.za/website-design-prices-south-africa
- WebproX: 5 pages R4,499; 15 pages R9,999 once-off with hosting conditions: https://www.webprox.co.za/
- eStart: 5 pages R9,500 and 10 pages R12,000 once-off: https://www.estart.co.za/web-design/
The products are not like-for-like; VAT, themes, CMS, hosting, copywriting, contract duration and ownership vary widely.

## Financial / contractual risks before approval
- Six-month managed subscription revenue (before setup fee): Sprout R1,194; Seedling R2,694; Vegetative R4,794; Budding R7,194; Flowering R10,794. Most larger sites are unprofitable unless the extra setup fee and standardised delivery contain costs. Assess build hours and customer affordability.
- Annual subscriptions provide a discounted annual payment **every year**, not a first-year price; maintenance scope must be sustainable.
- Need service tier entitlements and limits plus POPIA/consumer contract review. Do not repeat Sprout's 1 GB/1 mailbox automatically in larger packages without agreement.
- Keep existing published/legacy promotions untouched until carefully transitioned, avoid double pricing and misleading offers.
- All offered prices and terms must respect the fact Mogen currently operates as a non-VAT-registered sole proprietorship; do not claim corporate status.

## Next steps
1. Confirm/modify proposed package prices and managed setup fees.
2. Lock tier-specific inclusions, hosting, mailboxes, maintenance, delivery scope and payment start conditions.
3. Create a separate additive **draft-only** SQL migration for approved values. Never overwrite the verified Sprout rows.
4. Verify in the Neon `mogen-packages-dev` branch and run typecheck/build and enquiry regression.
5. Prepare website pricing launch and migration from legacy promotions after explicit publication authorisation.
