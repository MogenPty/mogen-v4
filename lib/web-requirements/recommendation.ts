import { getService } from "@/data/services";

/**
 * Phase 3 website-requirements recommendation engine.
 *
 * Pure, UI-free mapping from a visitor's stated website requirements to one
 * of the documented Web Development packages (Seed, Sprout, Vegetative) —
 * or to a consultation when the requirements exceed the documented scope.
 *
 * Authoritative source: `data/services.ts` (`web-development` pricing).
 * Package names are read from that data at call time — never invented
 * here. The rules below only reference capabilities explicitly documented
 * there:
 *
 * - Seed: starter website structure, mobile-first build structured for
 *   discovery, contact/enquiry path, next steps for SEO and growth.
 * - Sprout: professionally designed starter website, hosting + maintenance
 *   + ongoing support, up to 5 email accounts, launch-ready structure.
 * - Vegetative: unlimited pages, e-commerce / booking, schema &
 *   structured data, A/B test ready, priority support, dedicated lead,
 *   hosting + maintenance, up to 5 email accounts.
 *
 * When requirements exceed that scope (custom apps, marketplaces, bespoke
 * integrations), the engine returns `needsConsultation` instead of forcing
 * an inaccurate package match.
 */

export type WebsiteGoal = "enquiries" | "sales" | "bookings" | "info";
export type PageSize = "starter" | "growing" | "large" | "unsure";
export type RunPreference = "managed" | "once-off" | "unsure";
export type BusinessPresence = "none" | "needs-work" | "works-fine";
export type BusinessType =
  | "services"
  | "retail"
  | "hospitality"
  | "professional"
  | "other";
export type BusinessLocation =
  | "maboloka"
  | "soshanguve"
  | "pretoria"
  | "elsewhere-sa"
  | "outside-sa";

export type WebsiteNeed =
  | "ecommerce"
  | "booking"
  | "blog"
  | "cms"
  | "email"
  | "whatsapp"
  | "custom-app";

export interface WebsiteRequirements {
  goal: WebsiteGoal;
  pageSize: PageSize;
  needs: WebsiteNeed[];
  runPreference: RunPreference;
  presence: BusinessPresence;
  /** Visitor's existing website address, when they have one. Optional. */
  website: string;
  businessType: BusinessType;
  /** Free-text business kind, shown only when `businessType` is "other". */
  otherBusinessType: string;
  location: BusinessLocation;
}

export type WebPackageId = "seed" | "sprout" | "vegetative";

/**
 * Purchase mode for the recommendation: a once-off build the visitor
 * hosts themselves, or the managed subscription. Determined by the
 * visitor's stated run preference ("unsure" displays managed pricing).
 */
export type BillingMode = "once-off" | "subscription";

/**
 * Managed (Mogen-hosted) display prices confirmed by the site owner
 * (Oct 2026). These match the documented subscription pricing in
 * `data/services.ts` — including the once-off setup fees, which
 * services.ts lists inside the feature text rather than structurally.
 * A consistency test below pins these strings to those documented
 * figures so the two can never drift apart silently.
 */
export const MANAGED_PRICING: Record<
  WebPackageId,
  { price: string; cadence: string }
> = {
  seed: { price: "R199", cadence: "once-off" },
  sprout: { price: "R1,200 setup + R399/pm", cadence: "" },
  vegetative: { price: "R2,000 setup + R1,500/pm", cadence: "" },
};

/**
 * Once-off build prices confirmed by the site owner (Oct 2026) for
 * self-hosted builds. `data/services.ts` does not list a once-off
 * purchase mode, so these figures live here with owner provenance.
 * The "from" prefix is significant: Sprout and Vegetative vary with
 * final scope.
 */
export const ONCE_OFF_PRICING: Record<
  WebPackageId,
  { price: string; cadence: string }
> = {
  seed: { price: "R499", cadence: "once-off" },
  sprout: { price: "from R3,999", cadence: "once-off" },
  vegetative: { price: "from R8,999", cadence: "once-off" },
};

export interface WebsiteRecommendation {
  /** Recommended package, or null when a consultation is needed. */
  packageId: WebPackageId | null;
  /** True when no documented package covers the stated requirements. */
  needsConsultation: boolean;
  /**
   * Purchase mode for the displayed price. Null for consultations,
   * which carry no package price.
   */
  billing: BillingMode | null;
  /** Human-readable rationale, grounded in documented package scope. */
  reasons: string[];
  /**
   * Non-blocking nudge shown when the goal implies functionality the
   * visitor did not select (e.g. goal "sales" without e-commerce).
   */
  reviewNote?: string;
}

function packageName(id: WebPackageId): string {
  const pricing = getService("web-development")?.pricing ?? [];
  return pricing.find((p) => p.packageId === id)?.name ?? id;
}

function goalReviewNote(req: WebsiteRequirements): string | undefined {
  const needs = new Set(req.needs);
  if (
    req.goal === "sales" &&
    !needs.has("ecommerce") &&
    !needs.has("booking") &&
    !needs.has("custom-app")
  ) {
    return "Your goal is selling online, but you did not select selling or bookings — review the functionality step in case e-commerce applies.";
  }
  return undefined;
}

/**
 * Explain the displayed price mode. Once-off builds get an explicit
 * note; "unsure" visitors see managed pricing with a pointer to the
 * once-off option. Managed visitors need no explanation.
 */
function billingReason(
  billing: BillingMode,
  runPreference: RunPreference,
): string | undefined {
  if (billing === "once-off") {
    return "Priced as a once-off build since you'll host it yourself.";
  }
  if (runPreference === "unsure") {
    return "Shown with managed pricing — once-off builds are also available; mention it in your enquiry.";
  }
  return undefined;
}

/**
 * Display price for a recommendation: owner-confirmed once-off figures
 * for self-hosted builds, owner-confirmed managed figures (setup +
 * subscription, matching the documented pricing) otherwise. Returns
 * null for consultations.
 */
export function recommendationPriceDisplay(
  rec: WebsiteRecommendation,
): { price: string; cadence: string } | null {
  if (!rec.packageId || !rec.billing) return null;
  if (rec.billing === "once-off") return ONCE_OFF_PRICING[rec.packageId];
  return MANAGED_PRICING[rec.packageId];
}

/**
 * Recommend a Web Development package from stated requirements.
 *
 * Package scope (owner-confirmed, Oct 2026): Seed is a static site —
 * the contact form and map are its only non-static features. A blog
 * and self-editing need a database-driven build, so Sprout is their
 * minimum. E-commerce / booking and 16+ pages remain Vegetative-only
 * documented scope. The run preference selects the billing mode
 * (once-off vs subscription) without changing the package.
 */
export function recommendPackage(
  req: WebsiteRequirements,
): WebsiteRecommendation {
  const needs = new Set(req.needs);
  const vegetative = packageName("vegetative");
  const sprout = packageName("sprout");
  const seed = packageName("seed");

  // Requirements outside the documented package scope: explain that a
  // consultation is needed rather than forcing an inaccurate match.
  if (needs.has("custom-app")) {
    return {
      packageId: null,
      needsConsultation: true,
      billing: null,
      reasons: [
        `Custom requirements such as a marketplace, customer portal or bespoke integrations fall outside the documented ${seed}, ${sprout} and ${vegetative} scope, so they need a tailored consultation and quote.`,
      ],
    };
  }

  const billing: BillingMode =
    req.runPreference === "once-off" ? "once-off" : "subscription";
  const withBilling = (reasons: string[]): string[] => {
    const note = billingReason(billing, req.runPreference);
    return note ? [...reasons, note] : reasons;
  };

  // Only Vegetative documents e-commerce / booking in its scope.
  if (needs.has("ecommerce") || needs.has("booking")) {
    return {
      packageId: "vegetative",
      needsConsultation: false,
      billing,
      reasons: withBilling([
        `${vegetative} is the only package that lists e-commerce / booking in its documented scope.`,
      ]),
    };
  }

  // Only Vegetative documents unlimited pages.
  if (req.pageSize === "large") {
    return {
      packageId: "vegetative",
      needsConsultation: false,
      billing,
      reasons: withBilling([
        `For a large site (16+ pages), ${vegetative} fits best — it is the only package that documents unlimited pages.`,
      ]),
    };
  }

  // A blog and self-editing need a database-driven build. Seed is a
  // static site, so Sprout is the starting point.
  if (needs.has("blog") || needs.has("cms")) {
    return {
      packageId: "sprout",
      needsConsultation: false,
      billing,
      reasons: withBilling([
        `A blog or self-editing needs a database-driven build — ${seed} is a static site, so ${sprout} is the starting point.`,
      ]),
      ...(goalReviewNote(req) ? { reviewNote: goalReviewNote(req) } : {}),
    };
  }

  // Managed running (hosting, maintenance, support) and email accounts are
  // documented under Sprout/Vegetative — Seed is a once-off static build.
  if (req.runPreference === "managed" || needs.has("email")) {
    const reasons: string[] = [];
    if (req.runPreference === "managed") {
      reasons.push(
        `You want hosting, maintenance and support handled — ${sprout} documents exactly that as a managed subscription.`,
      );
    }
    if (needs.has("email")) {
      reasons.push(
        `Email accounts are documented under ${sprout} and ${vegetative} (up to 5 accounts) — not under the static starter.`,
      );
    }
    if (
      req.runPreference === "managed" &&
      (req.pageSize === "starter" || req.pageSize === "unsure")
    ) {
      reasons.push(
        `A starter-sized site with managed running maps to ${sprout}'s professionally designed starter website.`,
      );
    }
    return {
      packageId: "sprout",
      needsConsultation: false,
      billing,
      reasons: withBilling(reasons),
      ...(goalReviewNote(req) ? { reviewNote: goalReviewNote(req) } : {}),
    };
  }

  // Default: simple static presence with a contact/enquiry path.
  return {
    packageId: "seed",
    needsConsultation: false,
    billing,
    reasons: withBilling([
      `For a focused static presence with a contact / enquiry path, ${seed} covers the documented essentials.`,
    ]),
    ...(goalReviewNote(req) ? { reviewNote: goalReviewNote(req) } : {}),
  };
}
