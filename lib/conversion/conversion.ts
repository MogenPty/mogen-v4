import { getPackage } from "@/data/packages";
import {
  getEffectiveStatus,
  isFallbackFeaturingEnabled,
  todayISO,
  type Promotion,
} from "@/data/promotions";
import { getService } from "@/data/services";
import {
  buildEnquiryHref,
  type EnquiryAttribution,
} from "@/lib/enquiry/enquiry";

/**
 * Phase 2 conversion-journey selection for `ConversionBar`.
 *
 * Selection rules (stable — Phase 3 must not rewrite these) are kept
 * separate from destinations (temporary — Phase 3 replaces the Web
 * Development destination with the questionnaire):
 *
 * - `selectConversion()` — pure rules: page service + authoritative
 *   featured promotion → effective service + journey kind.
 * - `buildConversionCta()` — destinations: journey kind → label/href.
 * - `resolveConversion()` — convenience combining both.
 *
 * Promotion overrides use the existing authoritative selector
 * (`getFeaturedPromotion()` at the call site). This module never selects
 * a promotion itself; it only validates a caller-supplied featured
 * promotion (effectively active, featuring allowed, valid relatedService)
 * so expired/invalid promotions fall back safely.
 */

export type ConversionJourneyKind =
  | "seo-audit"
  | "web-enquiry"
  | "service-enquiry"
  | "default-audit";

export interface ConversionSelection {
  kind: ConversionJourneyKind;
  /** Effective service slug, undefined for the generic default audit. */
  effectiveServiceSlug?: string;
  /** Featured promotion slug that caused the override, if any. */
  overridingPromotionSlug?: string;
  /** True when the featured promotion overrode the page default. */
  overridden: boolean;
}

export interface SelectConversionInput {
  /** Page service context (e.g. service page slug, or "web-development" for the homepage). */
  serviceSlug?: string | null;
  /**
   * Authoritative featured promotion from `getFeaturedPromotion()`.
   * `undefined`/`null` means no active featured promotion.
   */
  featuredPromotion?: Promotion | null;
  /** YYYY-MM-DD override for tests. Defaults to today (UTC). */
  today?: string;
  /**
   * Whether an active-but-unfeatured promotion may override.
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
 * Pure conversion-selection rules.
 *
 * - A featured promotion overrides the page default only when it is
 *   effectively active, featuring is allowed, and `relatedService` resolves
 *   to a known service. Anything else falls back to the page default.
 * - `seo` → SEO audit, `web-development` → Web Development enquiry, any
 *   other known service → service enquiry, no service → default audit.
 */
export function selectConversion(
  input: SelectConversionInput,
): ConversionSelection {
  const today = input.today ?? todayISO();
  const allowFallback = input.allowFallback ?? isFallbackFeaturingEnabled();

  const pageSlug = cleanSlug(input.serviceSlug ?? undefined);
  const pageService = pageSlug ? findService(pageSlug) : undefined;

  const promo = input.featuredPromotion ?? undefined;
  if (promo) {
    if (getEffectiveStatus(promo, today) === "active") {
      const featuringOk = promo.isFeatured || allowFallback;
      const related = cleanSlug(promo.relatedService);
      const relatedService = related ? findService(related) : undefined;
      if (featuringOk && relatedService) {
        return {
          kind:
            relatedService.slug === "seo"
              ? "seo-audit"
              : relatedService.slug === "web-development"
                ? "web-enquiry"
                : "service-enquiry",
          effectiveServiceSlug: relatedService.slug,
          overridingPromotionSlug: promo.slug,
          overridden: true,
        };
      }
    }
  }

  if (pageService) {
    return {
      kind:
        pageService.slug === "seo"
          ? "seo-audit"
          : pageService.slug === "web-development"
            ? "web-enquiry"
            : "service-enquiry",
      effectiveServiceSlug: pageService.slug,
      overridden: false,
    };
  }

  return { kind: "default-audit", overridden: false };
}

export interface BuildConversionCtaInput {
  selection: ConversionSelection;
  /**
   * Audit destination base. Homepage passes "#audit" (same-page anchor);
   * every other page uses the cross-route "/#audit" default.
   */
  auditHref?: string;
  attribution?: EnquiryAttribution;
  /**
   * Package context to preserve (only when it belongs to the effective
   * service — never inferred from a promotion).
   */
  packageSlug?: string;
}

export interface ConversionCta {
  kind: ConversionJourneyKind;
  label: string;
  ariaLabel: string;
  href: string;
  effectiveServiceSlug?: string;
  overridingPromotionSlug?: string;
  overridden: boolean;
}

const AUDIT_LABEL = "Get Free Audit →";
const AUDIT_ARIA = "Get your free growth audit now";
const WEB_LABEL = "Start Your Website →";
const WEB_ARIA = "Start your website enquiry";
const ENQUIRY_LABEL = "Get a Quote →";

/**
 * Temporary Phase 2 destinations (all valid before Phase 3):
 *
 * - `seo-audit` / `default-audit` → existing audit anchor (homepage GrowthAudit).
 * - `web-enquiry` → existing contact flow with Web Development context
 *   (Phase 3 replaces this with the requirements questionnaire).
 * - `service-enquiry` → existing contact flow with the service context.
 *
 * Promotion overrides carry the promotion slug only; package/service are
 * resolved centrally by the Contact layer (no invented mappings).
 */
export function buildConversionCta(
  input: BuildConversionCtaInput,
): ConversionCta {
  const { selection } = input;
  const auditHref = input.auditHref ?? "/#audit";
  const attribution = input.attribution;

  if (
    selection.kind === "seo-audit" ||
    selection.kind === "default-audit"
  ) {
    return {
      kind: selection.kind,
      label: AUDIT_LABEL,
      ariaLabel: AUDIT_ARIA,
      href: auditHref,
      effectiveServiceSlug: selection.effectiveServiceSlug,
      overridingPromotionSlug: selection.overridingPromotionSlug,
      overridden: selection.overridden,
    };
  }

  if (selection.kind === "web-enquiry") {
    if (selection.overridingPromotionSlug) {
      return {
        kind: selection.kind,
        label: WEB_LABEL,
        ariaLabel: WEB_ARIA,
        href: buildEnquiryHref({
          promotion: selection.overridingPromotionSlug,
          attribution,
        }),
        effectiveServiceSlug: selection.effectiveServiceSlug,
        overridingPromotionSlug: selection.overridingPromotionSlug,
        overridden: true,
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
      label: WEB_LABEL,
      ariaLabel: WEB_ARIA,
      href: buildEnquiryHref({
        service: selection.effectiveServiceSlug,
        package: validPackage,
        attribution,
      }),
      effectiveServiceSlug: selection.effectiveServiceSlug,
      overridden: false,
    };
  }

  // service-enquiry (Digital Marketing, Business Documentation, future services)
  const serviceName = selection.effectiveServiceSlug
    ? (findService(selection.effectiveServiceSlug)?.name ??
      selection.effectiveServiceSlug)
    : undefined;
  if (selection.overridingPromotionSlug) {
    return {
      kind: selection.kind,
      label: ENQUIRY_LABEL,
      ariaLabel: serviceName
        ? `Get a quote for ${serviceName}`
        : "Get a quote",
      href: buildEnquiryHref({
        promotion: selection.overridingPromotionSlug,
        attribution,
      }),
      effectiveServiceSlug: selection.effectiveServiceSlug,
      overridingPromotionSlug: selection.overridingPromotionSlug,
      overridden: true,
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
    label: ENQUIRY_LABEL,
    ariaLabel: serviceName ? `Get a quote for ${serviceName}` : "Get a quote",
    href: buildEnquiryHref({
      service: selection.effectiveServiceSlug,
      package: validPackage,
      attribution,
    }),
    effectiveServiceSlug: selection.effectiveServiceSlug,
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
    auditHref: input.auditHref,
    attribution: input.attribution,
    packageSlug: input.packageSlug,
  });
}
