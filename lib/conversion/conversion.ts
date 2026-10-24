import {
  getEffectiveStatus,
  isFallbackFeaturingEnabled,
  todayISO,
  type Promotion,
} from "@/data/promotions";
import {
  getConversionBarSettings,
  getService,
  type ConversionBarSettings,
} from "@/data/services";
import {
  withAttribution,
  type EnquiryAttribution,
} from "@/lib/enquiry/enquiry";
import { WEBSITE_ASSESSMENT_ANCHOR } from "@/lib/web-requirements/questionnaire";

/**
 * Phase 3 conversion-journey selection for the site chrome CTAs
 * (header, Conversion Bar, footer — one shared destination per page).
 *
 * CTA copy lives in `data/services.ts` (`Service.conversionBar`, read via
 * `getConversionBarSettings()`); this module holds only the selection
 * rules and destination building.
 *
 * Selection rules (stable since Phase 2):
 *
 * - A service page always uses its own service's settings. A valid
 *   featured promotion whose `relatedService` matches the page service
 *   changes nothing about the destination (the page journey wins);
 *   a mismatched promotion is ignored (it never forces another
 *   service's CTA onto the page).
 * - The homepage and the promotions routes (the only callers that pass a
 *   featured promotion without a page service) use the promotion's
 *   service settings when the promotion is valid.
 * - Everywhere else the site-wide default applies: Web Development.
 *
 * Destinations (discovery CTAs target the service's conversion component):
 *
 * - Every service owns one conversion component on its own page:
 *   Web Development → the requirements questionnaire (`#assessment`),
 *   SEO → the growth audit (`#audit`), Digital Marketing and Business
 *   Documentation → the quote form (`#quote`).
 * - Same-page targets collapse to a bare anchor (`#assessment` on the
 *   homepage and on `/services/web-development`; `#audit` on
 *   `/services/seo`; `#quote` on its service page).
 * - Cross-page targets link to the component on its service page
 *   (`/services/web-development#assessment`, …) carrying only UTM
 *   attribution — never business context.
 * - Discovery CTAs never carry `?promotion=` / `?package=` / `?service=`.
 *   Decision CTAs ("Claim" buttons, package quote buttons, the
 *   questionnaire submission itself) carry decision context to `/contact`
 *   (or `POST /api/contact`) via `buildEnquiryHref` — that flow is owned
 *   by the claim components, never by this module.
 *
 * Promotion handling uses the existing authoritative selector
 * (`getFeaturedPromotion()`, resolved server-side at the call site and
 * passed in). This module never selects a promotion itself; it only
 * validates a caller-supplied featured promotion (effectively active,
 * featuring allowed, valid relatedService) so expired/invalid
 * promotions fall back safely.
 */

export type ConversionJourneyKind =
  | "seo-audit"
  | "web-enquiry"
  | "service-enquiry"
  | "default-audit";

/** Site-wide default service: Web Development takes centre stage. */
export const DEFAULT_CONVERSION_SERVICE_SLUG = "web-development";

export interface ConversionSelection {
  kind: ConversionJourneyKind;
  /** Effective service slug. */
  effectiveServiceSlug: string;
  /**
   * Valid featured promotion slug that selected the effective service
   * (homepage / promotions routes) or matched the page service.
   * Discovery destinations never carry it — decision ("Claim") CTAs do,
   * via `buildEnquiryHref` in the claim components.
   */
  promotionSlug?: string;
  /** True when the featured promotion selected the effective service. */
  overridden: boolean;
  /** Resolved settings driving label, aria-label, journey and href. */
  settings: ConversionBarSettings;
}

export interface SelectConversionInput {
  /** Page service context (service pages only — always wins). */
  serviceSlug?: string | null;
  /**
   * Fallback service identity for pages without a service context.
   * Defaults to Web Development (the site-wide default).
   */
  defaultServiceSlug?: string | null;
  /**
   * Authoritative featured promotion from `getFeaturedPromotion()`,
   * passed explicitly by the homepage and the promotions routes only.
   * `undefined`/`null` means no promotion applies here.
   */
  featuredPromotion?: Promotion | null;
  /** YYYY-MM-DD override for tests. Defaults to today (UTC). */
  today?: string;
  /**
   * Whether an active-but-unfeatured promotion may apply.
   * Defaults to `isFallbackFeaturingEnabled()` so the fallback-featuring
   * env flag is honoured without duplicating its logic.
   */
  allowFallback?: boolean;
}

function cleanSlug(value: string | null | undefined): string | undefined {
  const trimmed = value?.trim();
  return trimmed ? trimmed : undefined;
}

function findService(slug: string) {
  return (
    getService(slug) ?? getService(slug.toLowerCase()) ?? undefined
  );
}

/**
 * Resolve settings for a service slug, falling back to the Web
 * Development settings (never an SEO-centric default).
 */
function settingsFor(slug: string): ConversionBarSettings {
  return (
    getConversionBarSettings(slug) ??
    getConversionBarSettings(DEFAULT_CONVERSION_SERVICE_SLUG) as ConversionBarSettings
  );
}

function kindFor(serviceSlug: string): ConversionJourneyKind {
  if (serviceSlug === "seo") return "seo-audit";
  if (serviceSlug === "web-development") return "web-enquiry";
  return "service-enquiry";
}

/**
 * Pure conversion-selection rules. See the module docstring for the
 * page-wins contract.
 */
export function selectConversion(
  input: SelectConversionInput,
): ConversionSelection {
  const today = input.today ?? todayISO();
  const allowFallback = input.allowFallback ?? isFallbackFeaturingEnabled();

  const pageSlug = cleanSlug(input.serviceSlug ?? undefined);
  const pageService = pageSlug ? findService(pageSlug) : undefined;

  const promo = input.featuredPromotion ?? undefined;
  let promoServiceSlug: string | undefined;
  let promoSlug: string | undefined;
  if (promo && getEffectiveStatus(promo, today) === "active") {
    const featuringOk = promo.isFeatured || allowFallback;
    const related = cleanSlug(promo.relatedService);
    const relatedService = related ? findService(related) : undefined;
    if (featuringOk && relatedService) {
      promoServiceSlug = relatedService.slug;
      promoSlug = promo.slug;
    }
  }

  // Service pages always keep their own settings; a matching promotion
  // only contributes its `?promotion=` context.
  if (pageService) {
    const matched = promoSlug && promoServiceSlug === pageService.slug;
    return {
      kind: kindFor(pageService.slug),
      effectiveServiceSlug: pageService.slug,
      promotionSlug: matched ? promoSlug : undefined,
      overridden: false,
      settings: settingsFor(pageService.slug),
    };
  }

  // Homepage / promotions routes: the featured promotion's service wins.
  if (promoServiceSlug && promoSlug) {
    return {
      kind: kindFor(promoServiceSlug),
      effectiveServiceSlug: promoServiceSlug,
      promotionSlug: promoSlug,
      overridden: true,
      settings: settingsFor(promoServiceSlug),
    };
  }

  // Site-wide default: Web Development takes centre stage.
  const fallbackSlug =
    cleanSlug(input.defaultServiceSlug ?? undefined) ??
    DEFAULT_CONVERSION_SERVICE_SLUG;
  const fallbackService = findService(fallbackSlug);
  const effective = fallbackService?.slug ?? DEFAULT_CONVERSION_SERVICE_SLUG;
  return {
    kind: kindFor(effective),
    effectiveServiceSlug: effective,
    promotionSlug: undefined,
    overridden: false,
    settings: settingsFor(effective),
  };
}

export interface BuildConversionCtaInput {
  selection: ConversionSelection;
  attribution?: EnquiryAttribution;
  /**
   * Current pathname, used to collapse a component target to a same-page
   * anchor when the visitor is already where the component lives (e.g.
   * `/services/web-development#assessment` → `#assessment` on the Web
   * Development service page; `#assessment` on the homepage, which also
   * embeds the questionnaire).
   */
  pathname?: string;
}

export interface ConversionCta {
  kind: ConversionJourneyKind;
  label: string;
  ariaLabel: string;
  href: string;
  effectiveServiceSlug: string;
  /** Always undefined for discovery CTAs (see ConversionSelection). */
  promotionSlug?: string;
  overridden: boolean;
}

/**
 * Each service's conversion component: the questionnaire for Web
 * Development, the growth audit for SEO, the quote form for Digital
 * Marketing and Business Documentation. Chrome CTAs (header, bar,
 * footer) target these — one shared destination per page.
 */
const SERVICE_COMPONENT: Record<string, { page: string; anchor: string }> = {
  "web-development": {
    page: "/services/web-development",
    anchor: WEBSITE_ASSESSMENT_ANCHOR,
  },
  seo: { page: "/services/seo", anchor: "audit" },
  "digital-marketing": { page: "/services/digital-marketing", anchor: "quote" },
  "business-documentation": {
    page: "/services/business-documentation",
    anchor: "quote",
  },
};

/**
 * Collapse a `path#hash` audit href to its bare `#hash` anchor when the
 * visitor is already on that path. Cross-route hrefs are returned as-is
 * so they still navigate to the audit's page (e.g. the homepage SEO
 * promotion override links to `/services/seo/#audit`).
 */
function collapseToSamePageAnchor(
  href: string,
  pathname?: string,
): string {
  const hashIndex = href.indexOf("#");
  if (hashIndex < 0 || !pathname) return href;
  const hrefPath = (href.slice(0, hashIndex) || "/").replace(/\/+$/, "") || "/";
  if (hrefPath === pathname) return href.slice(hashIndex);
  return href;
}

/**
 * Build the CTA from resolved settings. Labels come from
 * `data/services.ts` — never hardcoded here. Destinations target the
 * effective service's conversion component: a bare anchor when the
 * component lives on the current page, otherwise the component's
 * service-page URL carrying only UTM attribution.
 */
export function buildConversionCta(
  input: BuildConversionCtaInput,
): ConversionCta {
  const { selection } = input;
  const attribution = input.attribution;

  if (selection.settings.journey === "audit") {
    return {
      kind: selection.kind,
      label: selection.settings.label,
      ariaLabel: selection.settings.ariaLabel,
      href: collapseToSamePageAnchor(
        selection.settings.href,
        input.pathname,
      ),
      effectiveServiceSlug: selection.effectiveServiceSlug,
      promotionSlug: undefined,
      overridden: selection.overridden,
    };
  }

  const component =
    SERVICE_COMPONENT[selection.effectiveServiceSlug] ??
    SERVICE_COMPONENT[DEFAULT_CONVERSION_SERVICE_SLUG];
  const target = `${component.page}#${component.anchor}`;
  // The questionnaire also lives on the homepage, so homepage visitors
  // stay on the page even though its canonical home is the Web
  // Development service page.
  const samePage =
    input.pathname === component.page ||
    (input.pathname === "/" &&
      component.anchor === WEBSITE_ASSESSMENT_ANCHOR);
  const href = samePage
    ? `#${component.anchor}`
    : withAttribution(target, attribution);
  return {
    kind: selection.kind,
    label: selection.settings.label,
    ariaLabel: selection.settings.ariaLabel,
    href,
    effectiveServiceSlug: selection.effectiveServiceSlug,
    promotionSlug: undefined,
    overridden: selection.overridden,
  };
}

export type ResolveConversionInput = SelectConversionInput &
  Omit<BuildConversionCtaInput, "selection">;

/** Convenience: selection rules + destinations in one call. */
export function resolveConversion(
  input: ResolveConversionInput,
): ConversionCta {
  const selection = selectConversion(input);
  return buildConversionCta({
    selection,
    attribution: input.attribution,
    pathname: input.pathname,
  });
}
