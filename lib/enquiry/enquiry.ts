import { getPromotionBySlug, type Promotion } from "@/data/promotions";
import { getService } from "@/data/services";

/**
 * Shared enquiry-context model for links into `/contact`.
 *
 * Two categories of URL information are kept distinct:
 *
 * - Business context (`service`, `promotion`) tells Mogen what the
 *   visitor is enquiring about.
 * - Marketing attribution (`utm_*`) tells analytics where the visitor
 *   came from. Attribution is tracking metadata — never customer-facing
 *   copy and never personal information.
 */

export interface EnquiryContext {
  service?: string;
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
  const promotion = get("promotion");
  if (service) context.service = service;
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
  promotion: Promotion | undefined;
  /** Display name to preselect in the service selector, if valid. */
  serviceName: string | undefined;
  /** Editable starter message, present only when valid promotion context exists. */
  message: string | undefined;
  attribution: EnquiryAttribution;
  /** True when an explicit service was overridden by the promotion's service. */
  serviceAdjusted: boolean;
  /** Non-blocking explanation shown when serviceAdjusted is true. */
  serviceNotice: string | undefined;
}

/**
 * Resolve a parsed context into service/promotion data + form defaults.
 *
 * The promotion's `relatedService` is the source of truth for the
 * promotion: a promotion without an explicit service selects its
 * associated service, and a contradictory explicit service is adjusted
 * to the promotion's service with a non-blocking notice — never
 * submitted as contradictory business context.
 */
export function resolveEnquiryDetails(
  context: EnquiryContext,
): ResolvedEnquiry {
  const service = resolveEnquiryService(context.service);
  const promotion = resolveEnquiryPromotion(context.promotion);
  const attribution: EnquiryAttribution = {};
  for (const key of ATTRIBUTION_KEYS) {
    if (context[key]) attribution[key] = context[key];
  }
  const promotionService = promotion?.relatedService
    ? resolveEnquiryService(promotion.relatedService)
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
  }
  return {
    service: effectiveService,
    promotion,
    serviceName: effectiveService?.name,
    message: promotion ? buildPromotionEnquiryMessage(promotion) : undefined,
    attribution,
    serviceAdjusted,
    serviceNotice,
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
 */
export function buildEnquiryHref(input: BuildEnquiryHrefInput): string {
  const existing = input.existingSearchParams
    ? parseEnquiryContext(input.existingSearchParams)
    : {};

  const service = clean(input.service) ?? existing.service;
  const promotion = clean(input.promotion) ?? existing.promotion;

  const params = new URLSearchParams();
  if (service) params.set("service", service);
  if (promotion) params.set("promotion", promotion);

  for (const key of ATTRIBUTION_KEYS) {
    const value = clean(input.attribution?.[key]) ?? existing[key];
    if (value) params.set(key, value);
  }

  const query = params.toString();
  return query ? `/contact?${query}` : "/contact";
}
