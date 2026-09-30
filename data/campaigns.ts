/**
 * Central campaign-attribution definitions for Mogen (Task 05).
 *
 * Campaign attribution (`utm_*`) is marketing metadata describing where a
 * visitor came from. It is deliberately separate from enquiry context
 * (`service`, `promotion`) — see `lib/enquiry/enquiry.ts`. This file holds
 * data only: no URL construction lives here (see `lib/campaign/campaign.ts`).
 *
 * Conventions:
 * - All values are lowercase (no names, emails, phone numbers, lead IDs or
 *   other personally identifiable information in UTM values).
 * - `utm_source` / `utm_medium` / `utm_campaign` are the minimum for normal
 *   Mogen social/promotional links.
 * - `utm_content` distinguishes a particular placement or creative.
 * - Only campaign/distribution links receive UTMs — normal internal
 *   navigation (`/promotions`, `/promotions/<slug>`) stays clean.
 */

// Promotion slug from the central promotion data (`data/promotions.ts`).
// Referenced here (not re-declared as a new slug) so the campaign
// destination always points at the canonical promotion.
export const MOGEN_SPROUT_PROMOTION_SLUG = "mogen-sprout-first-100";

/** Campaign destination derived from the central promotion slug. */
export const MOGEN_SPROUT_DESTINATION_PATH = `/promotions/${MOGEN_SPROUT_PROMOTION_SLUG}`;

/** Campaign ID and name for the Sprout launch campaign. */
export const MOGEN_SPROUT_CAMPAIGN_ID = "sprout-launch-2026";
export const MOGEN_SPROUT_CAMPAIGN_NAME = "sprout-launch-2026";

/**
 * Attribution values for one placement. Field names mirror the
 * `buildCampaignUrl` input (without `path`) so a definition can be spread
 * directly into the builder alongside a destination path.
 */
export interface CampaignLinkDefinition {
  /** Stable key for this placement, e.g. `whatsapp-catalog`. */
  key: string;
  /** Human-readable label, e.g. `WhatsApp Catalog`. */
  label: string;
  source: string;
  medium: string;
  campaign: string;
  content?: string;
  term?: string;
  id?: string;
}

export interface CampaignDefinition {
  /** Stable campaign identifier, e.g. `sprout-launch-2026`. */
  id: string;
  /** Display/reporting name. Lowercase by Mogen UTM convention. */
  name: string;
  /** Relative destination path (no query string, no domain). */
  destinationPath: string;
  /** Placement definitions for this campaign. */
  links: CampaignLinkDefinition[];
}

export const MOGEN_SPROUT_CAMPAIGN: CampaignDefinition = {
  id: MOGEN_SPROUT_CAMPAIGN_ID,
  name: MOGEN_SPROUT_CAMPAIGN_NAME,
  destinationPath: MOGEN_SPROUT_DESTINATION_PATH,
  links: [
    {
      key: "whatsapp-catalog",
      label: "WhatsApp Catalog",
      source: "whatsapp",
      medium: "organic_social",
      campaign: MOGEN_SPROUT_CAMPAIGN_ID,
      content: "whatsapp-catalog",
    },
    {
      key: "whatsapp-status",
      label: "WhatsApp Status",
      source: "whatsapp",
      medium: "organic_social",
      campaign: MOGEN_SPROUT_CAMPAIGN_ID,
      content: "whatsapp-status",
    },
    {
      key: "instagram-profile",
      label: "Instagram",
      source: "instagram",
      medium: "organic_social",
      campaign: MOGEN_SPROUT_CAMPAIGN_ID,
      content: "profile",
    },
    {
      key: "facebook-post",
      label: "Facebook",
      source: "facebook",
      medium: "organic_social",
      campaign: MOGEN_SPROUT_CAMPAIGN_ID,
      content: "post",
    },
    {
      key: "tiktok-profile",
      label: "TikTok",
      source: "tiktok",
      medium: "organic_social",
      campaign: MOGEN_SPROUT_CAMPAIGN_ID,
      content: "profile",
    },
    {
      key: "google-business-profile",
      label: "Google Business Profile",
      source: "google",
      medium: "organic",
      campaign: MOGEN_SPROUT_CAMPAIGN_ID,
      content: "business-profile",
    },
    {
      key: "qr-flyer",
      label: "QR / Printed Material",
      source: "qr",
      medium: "offline",
      campaign: MOGEN_SPROUT_CAMPAIGN_ID,
      content: "flyer",
    },
  ],
};

/**
 * All campaign definitions, keyed by campaign ID. Adding another campaign
 * (e.g. `seed-launch-2026`, `seo-audit-2026`, `black-friday-2026`) means
 * adding one entry here — the URL builder needs no changes.
 */
export const CAMPAIGNS: Record<string, CampaignDefinition> = {
  [MOGEN_SPROUT_CAMPAIGN.id]: MOGEN_SPROUT_CAMPAIGN,
};

/** Look up a campaign definition by ID. Returns undefined for unknown IDs. */
export function getCampaignDefinition(
  campaignId: string,
): CampaignDefinition | undefined {
  return CAMPAIGNS[campaignId];
}

/** All placement definitions for a campaign (empty array when unknown). */
export function getCampaignLinks(campaignId: string): CampaignLinkDefinition[] {
  return getCampaignDefinition(campaignId)?.links ?? [];
}

/** Look up a single placement within a campaign. */
export function getCampaignLink(
  campaignId: string,
  linkKey: string,
): CampaignLinkDefinition | undefined {
  return getCampaignLinks(campaignId).find((link) => link.key === linkKey);
}
