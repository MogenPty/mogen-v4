# Metadata Recommendation Report — SEO Remediation (2026-10-16)

Source: Rampify discovery + live-issue export (176 issues, 2026-10-16) and the
repository audit in `lib/seo/metadata-registry.ts`.

Standards: final title ≤ 60 chars (preferred 50–60), final meta description
≤ 160 chars (preferred 150–160). Final = after the root layout appends
` | Mogen`. Character counts use JavaScript string length. These are editorial
targets, not ranking guarantees — Google may truncate or rewrite snippets.

Brand strategy preserved: Mogen is primarily a web-development business, with
SEO, Digital Marketing and Business Documentation as supporting services.
No addresses, testimonials, pricing, guarantees or credentials were invented.
Location metadata uses owner-provided areas only (Tambo/Block-Y/Monavoni).

Status: **all rows below are implemented** except where marked otherwise.
Regression tests: `lib/seo/metadata-registry.test.ts` (16 tests).

## Static pages

| Route | Old title (len) | New title (final len) | Old desc (len) | New desc (len) | Intent / rationale |
|---|---|---|---|---|---|
| `/` | Mogen \| Web Development for South African Businesses (52) | unchanged (52) | 196 chars | Mogen builds fast websites for South African businesses — with SEO, marketing and documentation to help you grow. (117) | Homepage was the worst description offender; kept the performing title, rewrote desc under 160. |
| `/about` | About Mogen - A Web Development Agency in Maboloka, Soshanguve and Centurion, South Africa (90 → 98 final) | Web Development Agency for South African Business (56 final) | 185 | Mogen is a South African web development business in Maboloka — websites, SEO, marketing and documentation for local businesses. (128) | Old title stuffed three city names; new title states the business plainly. Page converted to shared `pageMetadata` helper (was bespoke). |
| `/contact` | Contact Us (10 → 18 final) | Request a Website Quote or Ask About Our Services (55 final) | 130 | unchanged | "Contact Us" told searchers nothing; new title carries the enquiry intent. Converted to shared helper. |
| `/articles` | Articles, news and practical growth advice for South African businesses (71 → 79 final) | Articles & Practical Growth Advice for SA Business (58 final) | 137 | unchanged | Tightened to fit; description was already compliant. |
| `/faq` | Frequently Asked Questions (26 → 34 final) | Website, SEO & Business Document FAQs Answered (53 final) | 172 | Answers on Mogen websites, SEO, marketing and documentation — timelines, pricing pointers, process and next steps. (114) | Old desc exceeded 160; new title names the actual topics. |
| `/services` | Services (8 → 16 final) | Website Development, SEO & Marketing Services (53 final) | 161 | …so you know what you pay for. (157) | One-word title + 1-char-over description fixed together. |
| `/pricing` | Affordable Web Development, SEO, Digital Marketing & Business Documentation Pricing (83 → 91 final) | Website, SEO & Marketing Pricing for SA Business (55 final) | 177 | Mogen pricing for websites, SEO, marketing and documentation — three tiers per service. See each service page for details. (122) | Old title was a keyword list; new copy states pricing intent. |
| `/process` | Process (7 → 15 final) | Our Process: From Invisible to In-Demand Websites (56 final) | 132 | unchanged | Mirrors the page's own "invisible to in-demand" framing. |
| `/promotions` | Current and past promotions (27 → 35 final) | Current Website Deals & Limited SA Promotions (52 final) | 132 | unchanged | Names the offer intent. |
| `/resources` | Resources (9 → 17 final) | Free SEO & Website Playbooks for SA Business (51 final) | 140 | unchanged | States what's on offer (free playbooks). |
| `/partners` | Partners (8 → 16 final) | Trusted Software Partners & Recommended Tools (52 final) | 101 | unchanged | Descriptive without inventing relationships. |
| `/success-stories` | Success Stories (15 → 23 final) | Website Structures That Turn Visits Into Enquiries (57 final) | 120 | unchanged | Reflects the page's actual pattern-library content (no named clients claimed). |
| `/privacy-policy` | Privacy Policy (14 → 22 final) | unchanged — documented exception (legal page, concise appropriate) | 121 | unchanged | — |
| `/terms-of-service` | Terms of Service (16 → 24 final) | unchanged — documented exception | 111 | unchanged | — |
| `/locations` | Our locations across North West, Gauteng and South Africa in general (68 → 76 final) | Our Offices & Service Areas in South Africa (50 final) | 176 | Mogen offices in Maboloka, Soshanguve and Centurion — websites, SEO, marketing and documentation for Gauteng and North West. (124) | Old title was a full sentence; new title fits exactly at the range floor. Added CollectionPage + ItemList + BreadcrumbList JSON-LD (was missing). |

## Location detail pages

| Route | Old title (final len) | New title (final len) | Old desc (len) | New desc (len) | Rationale |
|---|---|---|---|---|---|
| `/locations/maboloka` | Web Development, SEO, Digital Services & Business Documentation in Maboloka (83) | Web Development & SEO Services in Maboloka (50) | 169 | Mogen's head office in Tambo, Maboloka — websites, SEO, marketing and documentation. Visits by appointment. (107) | Same four-service meaning in half the words; Tambo area kept. |
| `/locations/soshanguve` | …in Soshanguve (85) | Web Development & SEO Services in Soshanguve (52) | 180 | Mogen's Soshanguve office in Block-Y — websites, SEO, marketing and documentation for local businesses. Visits by appointment. (126) | Full-service clarity kept; Block-Y retained (existing test contract). |
| `/locations/centurion` | …in Centurion (84) | Web Development & SEO Services in Centurion (51) | 179 | Mogen's Centurion office in Monavoni — websites, SEO, marketing and documentation for local businesses. Visits by appointment. (126) | Monavoni retained (existing test contract). |

LocalBusiness JSON-LD already existed on all three detail pages — verified, not duplicated.
The `/locations` index previously had no structured data; it now carries
CollectionPage + ItemList (three real offices) + BreadcrumbList.

## Service pages (new `metaDescription` field; visible taglines untouched)

| Route | Old title (final) | New title (final) | Old desc (= tagline) | New desc | Rationale |
|---|---|---|---|---|---|
| `/services/web-development` | Web Development & Web Design for South African Businesses (66) | Custom Web Development & Design for SA Business (54) | Custom websites engineered to convert visitors into customers. (62) | Custom websites engineered to convert — fast, mobile-first builds with on-page SEO, WhatsApp integration and analytics. (122) | Old title exceeded 60; tagline was too thin as a description. |
| `/services/seo` | Local SEO, Google Business Profile & Search Engine Optimisation (71) | Local SEO & Google Business Profile Services (51) | Local SEO that gets you found on Google — and brings real enquiries from nearby customers. (90) | Local SEO that gets you found on Google — audits, Google Business Profile optimisation and content that brings nearby enquiries. (128) | Same. |
| `/services/digital-marketing` | Digital Marketing Services for South African Businesses (63) | Digital Marketing Services for SA Businesses (51) | Get found online with content and campaigns that bring in new customers. (72) | Content, social and paid campaigns that put your business in front of the right people — with clear monthly reporting. (118) | Same. |
| `/services/business-documentation` | Business Documentation Services for South African Businesses (68) | Professional Business Documentation Services (51) | Professional business documents — policies, procedures, forms and templates that keep your operations clear and consistent. (130) | unchanged (promoted to `metaDescription` as-is) | Title only needed fixing. |

## Articles (frontmatter; slugs unchanged, H1 follows title)

| Slug | Old title (final) | New title (final) | Desc change |
|---|---|---|---|
| `digital-marketing-plan-small-businesses-gauteng` | Beyond Posting: A Practical Digital Marketing Plan for Small Businesses in Gauteng (90) | Digital Marketing Plan for Gauteng Small Business (56) | Rewritten (119): Gauteng focus kept, city list moved into body/keywords |
| `essential-business-documents-south-african-small-business` | The Essential Business Documents Every South African Small Business Should Organise (91) | Business Documents Every SA Small Business Needs (55) | 165 → 120 |
| `how-to-attract-the-right-customer-local-seo-maboloka-soshanguve-centurion` | Local SEO for Maboloka, Soshanguve and Centurion: How to Attract the Right Customers (92) | Local SEO: Attract the Right Nearby Customers (52) | 165 → 122 |
| `small-business-website-checklist-maboloka-soshanguve-centurion` | What Should a Small Business Website Include in 2026? A Guide for Maboloka, Soshanguve and Centurion (108) | What Your 2026 Small Business Website Must Include (57) | Rewritten (132); locations remain in body, keywords, tags |
| `top-10-web-design-trends-south-african-small-businesses-2026-7` | Top 10 Web Design Trends for South African Small Businesses in 2026/7 (77) | Top 10 Web Design Trends for SA Businesses (2026) (55) | 165 → 123 |
| `which-business-documents-does-a-south-african-small-business-actually-need` | Which Business Documents Does a South African Small Business Actually Need? (83) | Business Documents Your SA Small Business Needs (53) | 166 → 113 |
| `which-social-media-platform-features-can-boost-your-business-2026` | Which Social Media Platform Features Can Boost Your Business in 2026? (77) | Social Media Features That Boost Business in 2026 (56) | 162 → 113 |
| `web-development-in-the-brits-area` | Web Development in the Brits Area: Building Websites for Local Businesses (81) | Web Development for Brits-Area Local Businesses (54) | unchanged (≤160) |
| `google-search-console-september-2026-multimodal-search-seo` | Google Search Console's September 2026 Update: What Multimodal Search Means for SEO (91) | Google's Multimodal Search Update: SEO Impact (52) | unchanged |
| `restaurant-website-bookings-guide` | How Restaurants Can Use a Website to Generate More Bookings (67) | How Restaurants Win More Bookings With Websites (54) | unchanged |
| `local-seo-pretoria-2026` | The 2026 Local SEO Playbook for Pretoria Businesses (57 — compliant) | 2026 Local SEO Playbook for Pretoria Businesses (54) | unchanged ("map pack" kept) |
| 5 remaining articles | already compliant | unchanged | unchanged |

Note: shortening titles removes some city-name lists from titles, but the
location relevance remains in bodies, internal links (`/locations/*`),
keywords and tags. No stuffing was added anywhere.

## Promotions (names unchanged; card copy)

| Route | Title (final) | Old desc (len) | New desc (len) | Rationale |
|---|---|---|---|---|
| `/promotions/mogen-seed-r99` | Mogen Seed Website (27 — documented short-name exception) | 113 | unchanged | Offer (R99 once-off to 30 Oct 2026) verified in `data/promotions.ts`. |
| `/promotions/mogen-sprout-first-100` | Mogen Sprout Website (29 — exception) | 169 | Mogen's managed website subscription — design, hosting, maintenance and email for one monthly price. First 100 customers save. (129) | First-100 cap and monthly model preserved; visible card copy updated identically. |

## Approved exceptions (named routes only)

- `/privacy-policy`, `/terms-of-service` — concise legal titles appropriate.
- `/promotions/*` — promotion names are short by nature; detail in description.
- Tag archives (`/articles/tag/*`) — dynamic labels; short titles warn, never fail.
- `/growth-audit-results` — explicit noindex (personalised result), excluded.

## Owner-approval notes

- Article H1s changed together with titles (single frontmatter source). All new
  titles preserve the article's topic and intent — review the git diff.
- No owner wording approval is outstanding for the metadata itself; GBP, reviews
  and Search Console actions (Section 8 of the implementation report) need the owner.
