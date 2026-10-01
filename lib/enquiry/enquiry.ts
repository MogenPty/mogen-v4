import { getPackage, type ServicePackage } from "@/data/packages";
import { getPromotionBySlug, type Promotion } from "@/data/promotions";
import { getService } from "@/data/services";

/**
 * Shared enquiry-context model for links into `/contact`.
 *
 * Two categories of URL information are kept distinct:
 *
 * - Business context (`service`, `package`, `promotion`) tells Mogen what the
 *   visitor is enquiring about. Only the most specific identifier needs to
 *   travel in the URL — promotion implies its package and service, and a
 *   package implies its service (see `data/packages.ts`).
 * - Marketing attribution (`utm_*`) tells analytics where the visitor
 *   came from. Attribution is tracking metadata — never customer-facing
 *   copy and never personal information.
 */

export interface EnquiryContext {
  service?: string;
  package?: string;
  promotion?: string;

  utm_source?: string;
  utm_medium?: string;
  utm_campaign?: string;
  utm_content?: string;
  utm_term?: string;
  utm_id?: string;
}

/** Attribution parameters allowed to travel through enquiry URLs. */
export const ATTRIBUTION_KEYS = [
  "utm_source",
  "utm_medium",
  "utm_campaign",
  "utm_content",
  "utm_term",
  "utm_id",
] as const;

export type AttributionKey = (typeof ATTRIBUTION_KEYS)[number];

export type EnquiryAttribution = Partial<Record<AttributionKey, string>>;

type RawSearchParams =
  | URLSearchParams
  | Record<string, string | string[] | undefined>;

function firstValue(value: string | string[] | undefined): string | undefined {
  if (Array.isArray(value)) return value[0];
  return value;
}

function clean(value: string | undefined): string | undefined {
  if (value === undefined) return undefined;
  const trimmed = value.trim();
  return trimmed === "" ? undefined : trimmed;
}

/**
 * Parse business context + attribution out of incoming search params.
 * Accepts either a URLSearchParams instance or the App Router page
 * `searchParams` record shape. Unknown keys are ignored; empty values
 * are dropped.
 */
export function parseEnquiryContext(searchParams: RawSearchParams): EnquiryContext {
  const get = (key: string): string | undefined => {
    if (searchParams instanceof URLSearchParams) {
      return clean(searchParams.get(key) ?? undefined);
    }
    return clean(firstValue(searchParams[key]));
  };

  const context: EnquiryContext = {};
  const service = get("service");
  const pkg = get("package");
  const promotion = get("promotion");
  if (service) context.service = service;
  if (pkg) context.package = pkg;
  if (promotion) context.promotion = promotion;
  for (const key of ATTRIBUTION_KEYS) {
    const value = get(key);
    if (value) context[key] = value;
  }
  return context;
}

/** Parse only the attribution subset out of incoming search params. */
export function parseEnquiryAttribution(
  searchParams: RawSearchParams,
): EnquiryAttribution {
  const attribution: EnquiryAttribution = {};
  const get = (key: string): string | undefined => {
    if (searchParams instanceof URLSearchParams) {
      return clean(searchParams.get(key) ?? undefined);
    }
    return clean(firstValue(searchParams[key]));
  };
  for (const key of ATTRIBUTION_KEYS) {
    const value = get(key);
    if (value) attribution[key] = value;
  }
  return attribution;
}

/**
 * Minimal service identity used for enquiry resolution. A full `Service`
 * satisfies this; the "Other" catch-all (which has no entry in
 * data/services.ts) is represented as { slug: "other", name: "Other" }.
 */
export interface EnquiryService {
  slug: string;
  name: string;
}

/**
 * Resolve a service slug (e.g. `web-development`, `other`) to a service
 * identity. Returns undefined for missing/unknown slugs — callers must
 * fall back to the form's normal default state, never render an invalid
 * service as valid.
 */
export function resolveEnquiryService(
  slug: string | undefined,
): EnquiryService | undefined {
  const cleaned = clean(slug);
  if (!cleaned) return undefined;
  if (cleaned.toLowerCase() === "other") {
    return { slug: "other", name: "Other" };
  }
  const service = getService(cleaned);
  return service ? { slug: service.slug, name: service.name } : undefined;
}

/**
 * Resolve a package identifier (e.g. `sprout`, `ignition`) through the
 * central package registry (`data/packages.ts`). Returns undefined for
 * missing/unknown identifiers — callers fall back to service-only or
 * generic context, never render an invalid package as valid.
 */
export function resolveEnquiryPackage(
  id: string | undefined,
): ServicePackage | undefined {
  const cleaned = clean(id);
  if (!cleaned) return undefined;
  return getPackage(cleaned);
}

/**
 * Resolve a promotion slug (e.g. `mogen-sprout-first-100`) through the
 * central promotion data. Status is deliberately NOT checked here: a
 * scheduled (not yet active) promotion still contextualises an enquiry;
 * activation/expiry remains controlled by the promotion system.
 */
export function resolveEnquiryPromotion(
  slug: string | undefined,
): Promotion | undefined {
  const cleaned = clean(slug);
  if (!cleaned) return undefined;
  return getPromotionBySlug(cleaned);
}

/**
 * Build the visitor-facing starter message for a valid promotion from
 * the promotion data itself. Discounted price points in
 * `promotion.pricing` drive the pricing sentence, so the message stays
 * concise and never hardcodes values in the Contact component — only
 * the values present in the central promotion data appear. The message
 * is an editable initial value, never appended with UTM tracking
 * metadata.
 */
export function buildPromotionEnquiryMessage(promotion: Promotion): string {
  const base = `I'm interested in the ${promotion.name} promotion.`;
  const closing = "Please confirm my eligibility and the next steps.";
  const discounted = promotion.pricing.filter((p) => p.promotional);
  if (discounted.length === 0) {
    return `${base} ${closing}`;
  }
  let pricingSentence: string;
  if (discounted.length === 1) {
    const [point] = discounted;
    pricingSentence = `The promotional price is ${point.promotional}.`;
  } else {
    const fragments = discounted.map((p) => {
      const label = p.label.charAt(0).toLowerCase() + p.label.slice(1);
      return `the promotional ${label} is ${p.promotional}`;
    });
    pricingSentence = `${fragments.join(" and ")}`.replace(/^the/, "The");
    pricingSentence += ".";
  }
  if (promotion.promoDurationMonths) {
    pricingSentence = pricingSentence.replace(
      /\.$/,
      ` for the first ${promotion.promoDurationMonths} months.`,
    );
  }
  return `${base} ${pricingSentence} ${closing}`;
}

export interface ResolvedEnquiry {
  service: EnquiryService | undefined;
  package: ServicePackage | undefined;
  promotion: Promotion | undefined;
  /** Display name to preselect in the service selector, if valid. */
  serviceName: string | undefined;
  /** Display name of the resolved package, if any. */
  packageName: string | undefined;
  /** Editable starter message, present only when valid promotion context exists. */
  message: string | undefined;
  attribution: EnquiryAttribution;
  /** True when an explicit service was overridden by the promotion's service. */
  serviceAdjusted: boolean;
  /** Non-blocking explanation shown when serviceAdjusted is true. */
  serviceNotice: string | undefined;
  /** True when an explicit package was overridden by the promotion's package. */
  packageAdjusted: boolean;
  /** Non-blocking explanation shown when packageAdjusted is true. */
  packageNotice: string | undefined;
}

/**
 * Resolve a parsed context into package/service/promotion data + form defaults.
 *
 * The canonical chain is promotion → package → service, resolved centrally
 * so CTAs only carry the most specific identifier:
 *
 * - The promotion's `relatedPackage` is the source of truth for the
 *   promotion: a contradictory explicit package is adjusted to the
 *   promotion's package with a non-blocking notice.
 * - A resolved package infers its service: `package=sprout` resolves to
 *   Web Development, `package=ignition` to SEO. A contradictory explicit
 *   service is adjusted to the package's service with a non-blocking
 *   notice — never submitted as contradictory business context.
 * - A service-only context remains valid when no package can be inferred.
 */
export function resolveEnquiryDetails(
  context: EnquiryContext,
): ResolvedEnquiry {
  const service = resolveEnquiryService(context.service);
  const explicitPackage = resolveEnquiryPackage(context.package);
  const promotion = resolveEnquiryPromotion(context.promotion);
  const attribution: EnquiryAttribution = {};
  for (const key of ATTRIBUTION_KEYS) {
    if (context[key]) attribution[key] = context[key];
  }
  const promotionService = promotion?.relatedService
    ? resolveEnquiryService(promotion.relatedService)
    : undefined;
  const promotionPackage = promotion?.relatedPackage
    ? resolveEnquiryPackage(promotion.relatedPackage)
    : undefined;

  let effectivePackage = explicitPackage;
  let packageAdjusted = false;
  let packageNotice: string | undefined;
  if (promotion && promotionPackage) {
    if (!effectivePackage) {
      effectivePackage = promotionPackage;
    } else if (effectivePackage.id !== promotionPackage.id) {
      effectivePackage = promotionPackage;
      packageAdjusted = true;
      packageNotice = `This promotion applies to the ${promotionPackage.name} package, so the package selection has been adjusted.`;
    }
  }

  const packageService = effectivePackage
    ? resolveEnquiryService(effectivePackage.serviceSlug)
    : undefined;
  let effectiveService = service;
  let serviceAdjusted = false;
  let serviceNotice: string | undefined;
  if (promotion && promotionService) {
    if (!effectiveService) {
      effectiveService = promotionService;
    } else if (effectiveService.slug !== promotionService.slug) {
      effectiveService = promotionService;
      serviceAdjusted = true;
      serviceNotice = `This promotion applies to ${promotionService.name}, so the service selection has been adjusted.`;
    }
  } else if (packageService) {
    if (!effectiveService) {
      effectiveService = packageService;
    } else if (effectiveService.slug !== packageService.slug) {
      effectiveService = packageService;
      serviceAdjusted = true;
      serviceNotice = `The ${effectivePackage!.name} package applies to ${packageService.name}, so the service selection has been adjusted.`;
    }
  }
  return {
    service: effectiveService,
    package: effectivePackage,
    promotion,
    serviceName: effectiveService?.name,
    packageName: effectivePackage?.name,
    message: promotion ? buildPromotionEnquiryMessage(promotion) : undefined,
    attribution,
    serviceAdjusted,
    serviceNotice,
    packageAdjusted,
    packageNotice,
  };
}

/**
 * Decide which message the form should start with: a visitor's existing
 * (already typed) message always wins over generated promotion text, so
 * prefill never destroys user-entered data.
 */
export function preferExistingMessage(
  existingMessage: string,
  generatedMessage: string | undefined,
): string {
  if (existingMessage.trim() !== "") return existingMessage;
  return generatedMessage ?? "";
}

export interface BuildEnquiryHrefInput {
  service?: string;
  package?: string;
  promotion?: string;
  attribution?: EnquiryAttribution;
  /**
   * Existing params to extend (e.g. the current page's search params).
   * Only allowlisted attribution keys — plus service/promotion as a
   * fallback when no explicit value is given — are carried over.
   * Explicit values always win.
   */
  existingSearchParams?: RawSearchParams;
}

/**
 * Build a `/contact` URL carrying business context + attribution.
 * Uses URLSearchParams (correct encoding), omits undefined/empty
 * values, and never embeds business data beyond the identifiers.
 *
 * Pass the most specific identifier available — the Contact layer
 * resolves the complete context (`promotion` implies its package and
 * service; `package` implies its service).
 */
export function buildEnquiryHref(input: BuildEnquiryHrefInput): string {
  const existing = input.existingSearchParams
    ? parseEnquiryContext(input.existingSearchParams)
    : {};

  const service = clean(input.service) ?? existing.service;
  const pkg = clean(input.package) ?? existing.package;
  const promotion = clean(input.promotion) ?? existing.promotion;

  const params = new URLSearchParams();
  if (service) params.set("service", service);
  if (pkg) params.set("package", pkg);
  if (promotion) params.set("promotion", promotion);

  for (const key of ATTRIBUTION_KEYS) {
    const value = clean(input.attribution?.[key]) ?? existing[key];
    if (value) params.set(key, value);
  }

  const query = params.toString();
  return query ? `/contact?${query}` : "/contact";
}

/**
 * Carry allowlisted attribution (`utm_*` only) through an internal
 * navigation link (e.g. promotion detail → service page, homepage →
 * promotion detail) so a later CTA on that page can still forward it
 * into the enquiry URL.
 *
 * - Uses `URLSearchParams` (correct encoding, no manual concatenation).
 * - Only allowlisted attribution keys are added; unrelated keys are
 *   never introduced and an existing query string / hash on the path
 *   is preserved.
 * - Omits undefined/empty values. Returns the path unchanged when
 *   there is nothing to carry.
 */
export function withAttribution(
  path: string,
  attribution?: EnquiryAttribution,
): string {
  let base = path;
  let hash = "";
  const hashIndex = base.indexOf("#");
  if (hashIndex >= 0) {
    hash = base.slice(hashIndex);
    base = base.slice(0, hashIndex);
  }

  let pathname = base;
  let existingQuery = "";
  const queryIndex = base.indexOf("?");
  if (queryIndex >= 0) {
    pathname = base.slice(0, queryIndex);
    existingQuery = base.slice(queryIndex + 1);
  }

  const params = new URLSearchParams(existingQuery);
  for (const key of ATTRIBUTION_KEYS) {
    const value = clean(attribution?.[key]);
    if (value) params.set(key, value);
  }

  const query = params.toString();
  if (!query) return `${pathname}${hash}`;
  return `${pathname}?${query}${hash}`;
}
