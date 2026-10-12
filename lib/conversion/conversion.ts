import { getPackage } from "@/data/packages";
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
  buildEnquiryHref,
  type EnquiryAttribution,
} from "@/lib/enquiry/enquiry";

/**
 * Phase 2 conversion-journey selection for `ConversionBar`.
 *
 * CTA copy and destination bases live in `data/services.ts`
 * (`Service.conversionBar`, read via `getConversionBarSettings()` — no
 * `auditHref` prop, no duplicated labels); this module holds only the
 * selection rules and destination building.
 *
 * Selection rules (stable — Phase 3 must not rewrite these):
 *
 * - A service page always uses its own service's settings. A valid
 *   featured promotion whose `relatedService` matches the page service
 *   contributes its `?promotion=` context to the enquiry href; a
 *   mismatched promotion is ignored (it never forces another service's
 *   CTA onto the page).
 * - The homepage and the promotions routes (the only callers that pass a
 *   featured promotion without a page service) use the promotion's
 *   service settings when the promotion is valid.
 * - Everywhere else the site-wide default applies: Web Development.
 *
 * Destinations (temporary — Phase 3 replaces the Web Development
 * destination with the requirements questionnaire):
 *
 * - `audit` journey → the settings `href` as-is (existing GrowthAudit
 *   anchor), collapsed to a same-page anchor on the homepage.
 * - `enquiry` journey → the settings `href` base with service context,
 *   or with `?promotion=` context when a valid promotion is carried
 *   (package and service are resolved centrally by the Contact layer —
 *   never invented here).
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
   * Valid featured promotion slug to carry as `?promotion=` context.
   * Set when the promotion selected the effective service (homepage /
   * promotions routes) or when it matches the page service.
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
   * Package context to preserve (only when it belongs to the effective
   * service — never inferred from a promotion).
   */
  packageSlug?: string;
  /**
   * Current pathname, used to collapse a cross-route audit anchor
   * (`/#audit`) to a same-page anchor (`#audit`) on the homepage.
   */
  pathname?: string;
}

export interface ConversionCta {
  kind: ConversionJourneyKind;
  label: string;
  ariaLabel: string;
  href: string;
  effectiveServiceSlug: string;
  promotionSlug?: string;
  overridden: boolean;
}

/**
 * Build the CTA from resolved settings. Labels and destination bases
 * come from `data/services.ts` — never hardcoded here.
 */
export function buildConversionCta(
  input: BuildConversionCtaInput,
): ConversionCta {
  const { selection } = input;
  const attribution = input.attribution;

  if (selection.settings.journey === "audit") {
    const href =
      input.pathname === "/" && selection.settings.href.startsWith("/#")
        ? selection.settings.href.slice(1)
        : selection.settings.href;
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

  const base = selection.settings.href;
  if (selection.promotionSlug) {
    return {
      kind: selection.kind,
      label: selection.settings.label,
      ariaLabel: selection.settings.ariaLabel,
      href: buildEnquiryHref({
        base,
        promotion: selection.promotionSlug,
        attribution,
      }),
      effectiveServiceSlug: selection.effectiveServiceSlug,
      promotionSlug: selection.promotionSlug,
      overridden: selection.overridden,
    };
  }

  const pkg = cleanSlug(input.packageSlug);
  const resolved = pkg ? getPackage(pkg) : undefined;
  const validPackage =
    resolved && resolved.serviceSlug === selection.effectiveServiceSlug
      ? resolved.id
      : undefined;
  return {
    kind: selection.kind,
    label: selection.settings.label,
    ariaLabel: selection.settings.ariaLabel,
    href: buildEnquiryHref({
      base,
      service: selection.effectiveServiceSlug,
      package: validPackage,
      attribution,
    }),
    effectiveServiceSlug: selection.effectiveServiceSlug,
    promotionSlug: undefined,
    overridden: false,
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
    packageSlug: input.packageSlug,
    pathname: input.pathname,
  });
}
