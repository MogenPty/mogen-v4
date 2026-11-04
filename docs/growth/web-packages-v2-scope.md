# Web Development catalogue v2 — scope for review
Date: 2026-11-04. Status: proposed; NOT published or priced.

## Commercial principles
Seven complexity stages, available in every location. Location pages feature different stages rather than restricting availability. No guarantee of Google rank, leads, GBP approval, or particular conversion rate. No unlimited work, pages or support. The SEO foundation in website delivery is not monthly SEO management. Define ownership, domain/hosting and maintenance independently of website complexity.

## Proposed package boundaries

| Stage | Deliverable | Scope guardrails | SEO and measurement | Commercial model |
| --- | --- | --- | --- | --- |
| Seed | Assisted Google Business Profile (only when eligible) and WhatsApp Business profile, with enquiry link and handover; **no website** | One business, one eligible GBP, one WhatsApp account; customer owns accounts, verification not guaranteed | Category/services/profile completeness; no rankings promised | Once-off setup; ongoing management optional |
| Sprout | Single-page responsive business site with up to 5 sections, contact CTA and basic enquiry channel | No backend, no booking/commerce, no custom CMS | Indexability, titles, description, sitemap where applicable, Search Console guidance | Once-off build or separately priced managed hosting |
| Seedling | Multi-page brochure website, up to 5 pages and basic contact form | No bespoke workflows, payment processing or booking engine | Page-specific metadata, internal links, basic structured data where relevant, GSC setup with client authorisation | Once-off or managed |
| Vegetative | Growing-business website, up to 10 pages, editable content where required, enquiry and lead funnels | CMS choice scoped, basic integrations only, no bespoke portal | Keyword-to-page map for core services; technical on-page foundations; basic conversion events | Project fee plus optional management |
| Budding | Conversion-focused website, up to 15 pages, structured service/landing pages and one scoped integration | No bespoke complex application; extra landing pages quoted | Competitor/SERP research for agreed priority terms, landing-page optimisation, GA4/GSC conversion setup | Quote after discovery |
| Flowering | Advanced content website, up to 25 pages, CMS, booking OR commerce foundation OR workflow integration as scoped | Third-party fees, product counts, custom business rules excluded until quoted | Broader keyword mapping, technical SEO and conversion reporting setup | Quote-based |
| Ripening | Complex tailored platform with defined workflows, roles, integrations or advanced commerce | Requirements/discovery deliverables, phases, support SLA and acceptance tests quoted explicitly; no blanket unlimited claims | SEO architecture appropriate to publicly indexable pages, monitoring and measurement plan | Discovery and phased quote |

These limits are starting boundaries to cost and validate, not contractual commitments. Be careful that Sprout/Seedling may require domain/email purchase and client account ownership. Hosting, ongoing support and content creation must be explicit on every quote.

## Location campaign slots (desktop)
- **Maboloka:** Sprout (featured) / Seedling / Vegetative / Explore larger.
- **Soshanguve:** Explore smaller / Vegetative (featured) / Budding / Explore larger.
- **Centurion:** Explore smaller / Budding / Flowering (featured) / Ripening.
- Every location gets separate, visually secondary Seed strip: 'Not ready for a website? Ask about Google Business Profile + WhatsApp setup.' Eligibility checked.
- Mobile: featured first; then other packages in natural complexity order; exploration CTA clearly distinguishes 'smaller' or 'larger'. Four slots on desktop do not require four equally-sized pricing cards.
- Feature means recommended for the local sales conversation, NOT best value guaranteed. Client can select any stage.

## Other services
SEO, Digital Marketing, Business Documentation use their own existing service package registries. On location pages show short service teasers and one relevant CTA each after Web Development, not a 7x4 matrix.

## Migration safety
1. Introduce package catalogue v2 in a single source of truth with stable versioned IDs; preserve historical package IDs/aliases in enquiry records.
2. Replace existing old Seed website promotions only when new Seed meaning and offer are approved. Sunset or redirect old promotion pages to genuinely relevant new offer information; never silently advertise old R99/R199 offers.
3. Update all sources and surfaces together: data/packages.ts; data/services.ts; data/promotions.ts; promotion slugs; campaign selectors; pricing pages; enquiry context; recommendation engine; homepage questionnaire; FAQ; service cards; location cards; schema, metadata and tests.
4. Audit package CTA route and submission payload end to end. New questionnaire must not recommend old 3-tier definitions.
5. Pricing approval requires cost calculation for labour, maintenance, hosting, email, payment fees, third-party services and gross margin; do not invent monthly amounts or publish 'from' without an actually deliverable offering.
6. Roll out as separate feature PR with preview testing, snapshot screenshots for all three locations, regression tests and analytics events.

## KPI
Qualified enquiries, quotes and paying customers by source and location; supporting metrics organic non-branded clicks, conversion rate and CTR. Track operational cost per package.
