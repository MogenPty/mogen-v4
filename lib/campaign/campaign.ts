import { siteConfig } from "@/data/site";

/**
 * Reusable campaign URL builder (Task 05).
 *
 * Builds campaign-attribution URLs (`utm_*` only). Enquiry context
 * (`service`, `promotion`) is owned by `lib/enquiry/enquiry.ts` and is
 * never invented or modified here — Task 06 owns how attribution survives
 * the journey from campaign landing page to enquiry submission.
 *
 * Do NOT put names, email addresses, phone numbers, lead IDs, or other
 * personally identifiable information into UTM values.
 */

export interface BuildCampaignUrlInput {
  /** Relative destination path, e.g. `/promotions/mogen-sprout-first-100`. */
  path: string;
  source: string;
  medium: string;
  campaign: string;
  content?: string;
  term?: string;
  id?: string;
}

/** Attribution subset accepted wherever a placement definition is used. */
export interface CampaignAttributionInput {
  source: string;
  medium: string;
  campaign: string;
  content?: string;
  term?: string;
  id?: string;
}

function clean(value: string | undefined): string | undefined {
  if (value === undefined) return undefined;
  const trimmed = value.trim();
  return trimmed === "" ? undefined : trimmed;
}

function requireValue(value: string | undefined, name: string): string {
  const cleaned = clean(value);
  if (!cleaned) {
    throw new Error(
      `buildCampaignUrl: "${name}" is required and must not be empty.`,
    );
  }
  return cleaned;
}

/**
 * Build a relative campaign URL carrying `utm_*` attribution.
 *
 * - Uses `URLSearchParams` (correct encoding, no manual concatenation).
 * - Omits undefined/empty optional values (`content`, `term`, `id`) and
 *   clears any stale value for those keys already on the destination path.
 * - Preserves an existing query string / hash on the destination path.
 * - Returns a relative URL (no domain); use `toAbsoluteCampaignUrl` when an
 *   absolute URL is needed for external distribution.
 */
export function buildCampaignUrl(input: BuildCampaignUrlInput): string {
  const rawPath = clean(input.path);
  if (!rawPath) {
    throw new Error(
      `buildCampaignUrl: "path" is required and must not be empty.`,
    );
  }
  const source = requireValue(input.source, "source");
  const medium = requireValue(input.medium, "medium");
  const campaign = requireValue(input.campaign, "campaign");
  const content = clean(input.content);
  const term = clean(input.term);
  const id = clean(input.id);

  let base = rawPath;
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
  params.set("utm_source", source);
  params.set("utm_medium", medium);
  params.set("utm_campaign", campaign);
  // The builder owns the utm_* keys: a supplied optional value sets its
  // key, an absent one clears any stale value from the destination path.
  // Unrelated query parameters are always preserved.
  if (content) params.set("utm_content", content);
  else params.delete("utm_content");
  if (term) params.set("utm_term", term);
  else params.delete("utm_term");
  if (id) params.set("utm_id", id);
  else params.delete("utm_id");

  const query = params.toString();
  if (!query) return `${pathname}${hash}`;
  return `${pathname}?${query}${hash}`;
}

/**
 * Build a campaign URL from a placement definition plus a destination path.
 * Convenience wrapper so centralized definitions (`data/campaigns.ts`) can
 * be spread directly into the builder without duplicating UTM strings.
 */
export function buildCampaignLinkUrl(
  link: CampaignAttributionInput,
  destinationPath: string,
): string {
  return buildCampaignUrl({
    path: destinationPath,
    source: link.source,
    medium: link.medium,
    campaign: link.campaign,
    content: link.content,
    term: link.term,
    id: link.id,
  });
}

/**
 * Prefix a relative campaign URL with the canonical site URL
 * (`data/site.ts`) for external distribution. The builder itself stays
 * relative so internal code never hardcodes a domain.
 */
export function toAbsoluteCampaignUrl(
  relativeUrl: string,
  baseUrl: string = siteConfig.url,
): string {
  const cleaned = clean(relativeUrl);
  if (!cleaned) {
    throw new Error("toAbsoluteCampaignUrl: relative URL must not be empty.");
  }
  const base = clean(baseUrl)?.replace(/\/+$/, "") ?? "";
  if (cleaned.startsWith("http://") || cleaned.startsWith("https://")) {
    return cleaned;
  }
  const path = cleaned.startsWith("/") ? cleaned : `/${cleaned}`;
  return `${base}${path}`;
}
