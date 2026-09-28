/**
 * Central promotion data source for the Mogen Promotion System.
 *
 * All promotion surfaces (homepage, /promotions, /promotions/[slug])
 * consume this data through the selector functions below — never by
 * manipulating the raw PROMOTIONS array directly.
 *
 * The model is deliberately UI-agnostic so it can later move from this
 * static TypeScript file into a database/CMS without rewriting the UI.
 */

export type PromotionStatus =
  | "draft"
  | "scheduled"
  | "active"
  | "expired"
  | "archived";

export interface PromotionImage {
  src: string;
  alt: string;
  caption?: string;
}

export interface PromotionCta {
  label: string;
  href: string;
}

export interface PromotionPricePoint {
  /** e.g. "Setup fee", "Monthly subscription", "Additional pages" */
  label: string;
  /** Regular (non-promotional) price display, e.g. "R1,200" */
  regular: string;
  /** Promotional price display, e.g. "R900". Omit when not discounted. */
  promotional?: string;
  /** e.g. "once-off", "/month" */
  cadence?: string;
  /** Extra clarification shown under the price line. */
  note?: string;
}

export interface PromotionStep {
  title: string;
  description: string;
}

export interface PromotionFaq {
  q: string;
  a: string;
}

export interface Promotion {
  id: string;
  slug: string;
  name: string;
  shortDescription: string;
  description: string;

  status: PromotionStatus;
  /**
   * ISO date strings (YYYY-MM-DD). These drive the *effective* status via
   * getEffectiveStatus(): a dated promotion activates on startDate and
   * expires after endDate (inclusive) without a data edit. An explicit
   * `expired`, `draft` or `archived` status always sticks — dates never
   * revive those, so allocation-based endings (e.g. Sprout's 100-customer
   * cap) still end via a manual flip to `expired`.
   */
  startDate?: string;
  endDate?: string;

  /** Explicit featuring — never inferred from sortOrder. */
  isFeatured: boolean;
  sortOrder: number;

  pricing: PromotionPricePoint[];
  eligibility: string[];
  terms: string[];

  /** Promotional campaign images. Optional — may be empty. */
  images: PromotionImage[];

  cta: PromotionCta;
  relatedService?: string;

  /**
   * Allocation cap for capacity-limited campaigns (e.g. first 100
   * customers). No counting/billing logic is built yet — this field
   * exists so a real allocation source can be wired in later.
   */
  maximumCustomers?: number;
  /** How many months the promotional recurring price applies, if any. */
  promoDurationMonths?: number;

  included?: string[];
  howItWorks?: PromotionStep[];
  faqs?: PromotionFaq[];
  billingNote?: string;
  savingsCallout?: string;
}

export const PROMOTIONS: Promotion[] = [
  {
    id: "mogen-seed",
    slug: "mogen-seed-r99",
    name: "Mogen Seed Website",
    shortDescription:
      "A focused starter website for businesses that need a professional online presence without unnecessary complexity.",
    description:
      "A focused starter website for businesses that need a professional online presence without unnecessary complexity. Clean structure, mobile-first build, and the essentials to get found and contacted.",
    status: "active",
    endDate: "2026-10-30",
    isFeatured: true,
    sortOrder: 1,
    pricing: [
      {
        label: "Mogen Seed Website",
        regular: "R199",
        promotional: "R99",
        cadence: "once-off",
        note: "Regular price R199 — now R99 while the promotion is active.",
      },
    ],
    eligibility: [
      "Available to new and existing Mogen customers while the promotion is active.",
    ],
    terms: [
      "Promotion price valid while the promotion is active.",
      "Current campaign runs through 30 October 2026.",
      "Promotion terms available on request.",
    ],
    images: [],
    cta: { label: "Claim Mogen Seed", href: "/contact" },
    relatedService: "web-development",
    included: [
      "Starter website structure tailored to your business",
      "Mobile-first, fast and structured for discovery",
      "Contact / enquiry path set up",
      "Clear next steps for SEO and growth",
    ],
  },
  {
    id: "mogen-sprout",
    slug: "mogen-sprout-first-100",
    name: "Mogen Sprout Website",
    shortDescription:
      "Mogen's managed website subscription — professional website, hosting, maintenance and email handled for one monthly price. Available to the first 100 eligible customers.",
    description:
      "Mogen Sprout is the managed way to get online: Mogen designs and builds your website, then keeps it hosted, maintained and supported for one monthly subscription. This launch promotion discounts the setup fee and the monthly subscription for the first 12 months for the first 100 eligible customers.",
    status: "scheduled",
    startDate: "2026-10-01",
    isFeatured: false,
    sortOrder: 2,
    pricing: [
      {
        label: "Setup fee",
        regular: "R1,200",
        promotional: "R900",
        cadence: "once-off",
        note: "Paid before development begins. Save R300 on setup.",
      },
      {
        label: "Monthly subscription",
        regular: "R399/month",
        promotional: "R299/month",
        cadence: "/month",
        note: "Promotional rate applies for the first 12 months, then the normal R399/month applies.",
      },
      {
        label: "Additional pages",
        regular: "R150/month",
        cadence: "per additional 5 pages",
        note: "Not discounted — additional pages remain R150/month per additional 5 pages.",
      },
    ],
    eligibility: [
      "Available to customers who are not already on Sprout, because Sprout requires the setup fee before development begins.",
      "Limited to the first 100 eligible customers.",
    ],
    terms: [
      "Promotion starts 1 October 2026 and ends when the 100-customer allocation is exhausted, unless Mogen extends it.",
      "The promotional monthly rate of R299/month applies for the first 12 months of the subscription. Thereafter the normal R399/month applies.",
      "Additional pages remain R150/month per additional 5 pages and are not discounted by this promotion.",
      "Monthly subscription fees are paid in advance.",
      "No customer counters or availability claims are shown until a real allocation source exists.",
    ],
    images: [],
    cta: { label: "Claim Sprout Offer", href: "/contact" },
    relatedService: "web-development",
    maximumCustomers: 100,
    promoDurationMonths: 12,
    included: [
      "Professionally designed starter website",
      "Hosting, maintenance and ongoing support",
      "Mogen email services available",
      "Launch-ready structure for SEO and growth",
    ],
    howItWorks: [
      {
        title: "Accept the offer",
        description:
          "Confirm you want the Sprout promotion and that you are not already on Sprout.",
      },
      {
        title: "Pay the R900 setup fee",
        description:
          "The once-off setup fee is paid before development begins.",
      },
      {
        title: "We build your website",
        description:
          "Mogen designs and develops your website, then walks through a review with you.",
      },
      {
        title: "Website launches",
        description:
          "Your site goes live once development and review are complete.",
      },
      {
        title: "Monthly subscription begins",
        description:
          "The monthly Sprout subscription begins when the website launches. The first monthly charge may be pro-rated depending on the launch date.",
      },
    ],
    faqs: [
      {
        q: "When does monthly billing start?",
        a: "The monthly subscription normally begins when the website launches and may be pro-rated for the first month. If you want Mogen email services active from the beginning of development, monthly billing may begin earlier.",
      },
      {
        q: "How long does the R299/month rate last?",
        a: "The promotional R299/month rate applies for the first 12 months. After that, the normal R399/month applies.",
      },
      {
        q: "Are additional pages discounted?",
        a: "No. Additional pages remain R150/month per additional 5 pages. The promotion discounts the setup fee and the base monthly subscription only.",
      },
      {
        q: "Who is eligible?",
        a: "Customers who are not already on Sprout, because Sprout requires the setup fee before development begins. The offer is limited to the first 100 eligible customers.",
      },
    ],
    billingNote:
      "Monthly subscription fees are paid in advance. The monthly subscription normally begins when the website launches and may be pro-rated for the first month.",
    savingsCallout:
      "First-year total: R4,488 on promotion vs R5,988 normally — save R1,500 in year one (R900 + R299 × 12 vs R1,200 + R399 × 12).",
  },
];

// ---------------------------------------------------------------------------
// Selectors — UI code must use these, not the raw PROMOTIONS array.
// ---------------------------------------------------------------------------

/** Today's date as YYYY-MM-DD (UTC). Inject a value in tests to freeze time. */
export function todayISO(now: Date = new Date()): string {
  return now.toISOString().slice(0, 10);
}

/**
 * Effective status of a promotion on a given day (YYYY-MM-DD).
 * ISO strings compare lexicographically, so no Date parsing is needed.
 *
 * - `draft` / `archived` / explicit `expired` always stick — dates never
 *   revive them. Allocation-based endings (no endDate) end via manual flip.
 * - Past endDate (inclusive) → `expired`.
 * - `scheduled` activates once its startDate arrives; without a startDate it
 *   stays `scheduled` (never silently goes live).
 * - `active` with a future startDate reads as `scheduled`.
 */
export function getEffectiveStatus(
  promotion: Promotion,
  today: string = todayISO(),
): PromotionStatus {
  if (
    promotion.status === "draft" ||
    promotion.status === "archived" ||
    promotion.status === "expired"
  ) {
    return promotion.status;
  }
  if (promotion.endDate && today > promotion.endDate) return "expired";
  if (promotion.status === "scheduled") {
    return promotion.startDate && today >= promotion.startDate
      ? "active"
      : "scheduled";
  }
  if (promotion.status === "active") {
    if (promotion.startDate && today < promotion.startDate) return "scheduled";
    return "active";
  }
  return promotion.status;
}

/**
 * Fallback-featuring kill switch. Read at call time (server-side) from a
 * plain server-only env var so it can be flipped without a redeploy
 * (takes effect on next ISR regeneration). Defaults to false.
 * NEVER expose as NEXT_PUBLIC_ — homepage featuring is decided server-side.
 */
export function isFallbackFeaturingEnabled(): boolean {
  return process.env.MOGEN_ALLOW_FALLBACK_FEATURING === "true";
}

/** All promotions in raw (sortOrder) order. */
export function getPromotions(): Promotion[] {
  return [...PROMOTIONS].sort((a, b) => a.sortOrder - b.sortOrder);
}

export function getPromotionBySlug(slug: string): Promotion | undefined {
  return PROMOTIONS.find((p) => p.slug === slug);
}

export function getActivePromotions(today: string = todayISO()): Promotion[] {
  return getPromotions().filter(
    (p) => getEffectiveStatus(p, today) === "active",
  );
}

/**
 * The single promotion for the homepage: must be effectively active AND
 * explicitly featured. Returns undefined when none qualifies — callers
 * must then render no promotion section at all.
 *
 * When fallback featuring is enabled (env, default off), an active but
 * unfeatured promotion with the lowest sortOrder is returned instead of
 * undefined. Explicit featuring always wins when present.
 */
export function getFeaturedPromotion(
  today: string = todayISO(),
  allowFallback: boolean = isFallbackFeaturingEnabled(),
): Promotion | undefined {
  const actives = getActivePromotions(today);
  const featured = actives.find((p) => p.isFeatured);
  if (featured) return featured;
  if (allowFallback) return actives[0];
  return undefined;
}

function publicRank(p: Promotion, today: string): number {
  const status = getEffectiveStatus(p, today);
  if (status === "active" && p.isFeatured) return 0;
  if (status === "active") return 1;
  if (status === "scheduled") return 2;
  if (status === "expired") return 3;
  return 4;
}

/**
 * Pure ordering helper (exported for testing): active featured first,
 * then other active, then scheduled, then expired — each by sortOrder.
 * Draft and archived promotions are excluded from public listing.
 */
export function orderPublicPromotions(
  list: Promotion[],
  today: string = todayISO(),
): Promotion[] {
  return [...list]
    .filter((p) => {
      const status = getEffectiveStatus(p, today);
      return status !== "draft" && status !== "archived";
    })
    .sort(
      (a, b) =>
        publicRank(a, today) - publicRank(b, today) ||
        a.sortOrder - b.sortOrder,
    );
}

/** Public promotions for /promotions, in display order. */
export function getPublicPromotions(today: string = todayISO()): Promotion[] {
  return orderPublicPromotions(PROMOTIONS, today);
}

export function isPromotionExpired(
  promotion: Promotion,
  today: string = todayISO(),
): boolean {
  return getEffectiveStatus(promotion, today) === "expired";
}

export function getPromotionStatusLabel(status: PromotionStatus): string {
  switch (status) {
    case "active":
      return "Active";
    case "scheduled":
      return "Coming soon";
    case "expired":
      return "Promotion ended";
    case "archived":
      return "Archived";
    case "draft":
      return "Draft";
  }
}

// ---------------------------------------------------------------------------
// Deprecated aliases — kept so older imports keep working.
// Prefer getFeaturedPromotion() / getPromotionBySlug() in new code.
// ---------------------------------------------------------------------------

/** @deprecated Use getFeaturedPromotion() instead. */
export const getActivePromotion = getFeaturedPromotion;

/** @deprecated Use getPromotionBySlug() instead. */
export const getPromotion = getPromotionBySlug;
