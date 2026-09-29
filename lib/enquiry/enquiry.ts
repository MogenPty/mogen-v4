import { getPromotionBySlug, type Promotion } from "@/data/promotions";
import { getService, type Service } from "@/data/services";

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
 * Resolve a service slug (e.g. `web-development`) to the existing
 * service data. Returns undefined for missing/unknown slugs — callers
 * must fall back to the form's normal default state, never render an
 * invalid service as valid.
 */
export function resolveEnquiryService(
  slug: string | undefined,
): Service | undefined {
  const cleaned = clean(slug);
  if (!cleaned) return undefined;
  return getService(cleaned);
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
 * the promotion data itself. No pricing is embedded — the promotion
 * data remains the source of truth. The message is an editable initial
 * value, never appended with UTM tracking metadata.
 */
export function buildPromotionEnquiryMessage(promotion: Promotion): string {
  return `I'm interested in the ${promotion.name} promotion. Please confirm eligibility and the next steps.`;
}

export interface ResolvedEnquiry {
  service: Service | undefined;
  promotion: Promotion | undefined;
  /** Display name to preselect in the service selector, if valid. */
  serviceName: string | undefined;
  /** Editable starter message, present only when valid promotion context exists. */
  message: string | undefined;
  attribution: EnquiryAttribution;
}

/** Resolve a parsed context into service/promotion data + form defaults. */
export function resolveEnquiryDetails(
  context: EnquiryContext,
): ResolvedEnquiry {
  const service = resolveEnquiryService(context.service);
  const promotion = resolveEnquiryPromotion(context.promotion);
  const attribution: EnquiryAttribution = {};
  for (const key of ATTRIBUTION_KEYS) {
    if (context[key]) attribution[key] = context[key];
  }
  return {
    service,
    promotion,
    serviceName: service?.name,
    message: promotion ? buildPromotionEnquiryMessage(promotion) : undefined,
    attribution,
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
