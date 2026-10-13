import { getService } from "@/data/services";
import type { EnquiryAttribution } from "@/lib/enquiry/enquiry";
import { recommendationPriceDisplay } from "./recommendation";
import type {
  WebsiteNeed,
  WebsiteRecommendation,
  WebsiteRequirements,
} from "./recommendation";

/**
 * Phase 3 questionnaire helpers: step model, gating validation, and the
 * enquiry payload builder for the homepage website-requirements
 * questionnaire.
 *
 * The questionnaire submits through the existing contact pipeline
 * (`POST /api/contact`, validated by `contactInputSchema`) — no duplicate
 * endpoint, provider or mail contract. The package travels as a resolved
 * identifier and is re-validated server-side by
 * `resolveSubmissionPackage()`; unknown or service-mismatched values are
 * dropped there, so client claims are never trusted.
 */

/** Anchor of the embedded homepage questionnaire section. */
export const WEBSITE_ASSESSMENT_ANCHOR = "assessment";

export const QUESTIONNAIRE_STEPS = [
  { id: "contact", label: "Contact details" },
  { id: "business", label: "Your business" },
  { id: "needs", label: "Website needs" },
  { id: "location", label: "Location" },
  { id: "recommendation", label: "Recommendation" },
] as const;

export type QuestionnaireStepId =
  (typeof QUESTIONNAIRE_STEPS)[number]["id"];

export interface QuestionnaireContact {
  name: string;
  email: string;
  phone: string;
  businessName: string;
  /** Honeypot — must stay empty. Checked server-side. */
  companyWebsite: string;
}

export const EMPTY_CONTACT: QuestionnaireContact = {
  name: "",
  email: "",
  phone: "",
  businessName: "",
  companyWebsite: "",
};

export const DEFAULT_REQUIREMENTS: WebsiteRequirements = {
  goal: "enquiries",
  pageSize: "unsure",
  needs: [],
  runPreference: "unsure",
  presence: "none",
  website: "",
  businessType: "services",
  otherBusinessType: "",
  location: "pretoria",
};

const EMAIL_PATTERN = /^\S+@\S+\.\S+$/;
/** Accepts `yourbusiness.co.za` or a full URL — scheme optional. */
const WEBSITE_PATTERN = /^(https?:\/\/)?[\w-]+(\.[\w-]+)+(:\d+)?(\/\S*)?$/i;

export interface ContactErrors {
  name?: string;
  email?: string;
}

/** Client-side gating for step 1. The server schema remains authoritative. */
export function validateContact(contact: QuestionnaireContact): ContactErrors {
  const errors: ContactErrors = {};
  if (contact.name.trim().length < 2) {
    errors.name = "Please enter your name.";
  }
  if (!EMAIL_PATTERN.test(contact.email.trim())) {
    errors.email = "Please enter a valid email address.";
  }
  return errors;
}

/**
 * Client-side check for the conditional website field. Empty is valid
 * (the field is optional) — a provided value must look like a website
 * address. The server schema remains authoritative for the submission.
 */
export function validateWebsiteUrl(value: string): string | undefined {
  const trimmed = value.trim();
  if (trimmed === "") return undefined;
  if (!WEBSITE_PATTERN.test(trimmed)) {
    return "Please enter a valid website address, e.g. yourbusiness.co.za.";
  }
  return undefined;
}

/**
 * Whether the visitor may advance past `step`. Contact details are
 * required before any subsequent question — later steps additionally
 * require their own selections (all have defaults, so they always pass;
 * the type keeps the gate explicit and testable).
 */
export function canProceed(
  step: QuestionnaireStepId,
  contact: QuestionnaireContact,
): boolean {
  if (step === "contact") return true;
  return Object.keys(validateContact(contact)).length === 0;
}

const GOAL_LABELS: Record<WebsiteRequirements["goal"], string> = {
  enquiries: "getting enquiries",
  sales: "selling online",
  bookings: "taking bookings",
  info: "sharing information",
};

const PAGE_LABELS: Record<WebsiteRequirements["pageSize"], string> = {
  starter: "starter (1–5 pages)",
  growing: "growing (6–15 pages)",
  large: "large (16+ pages)",
  unsure: "not sure yet",
};

const NEED_LABELS: Record<WebsiteNeed, string> = {
  ecommerce: "sell online",
  booking: "online bookings",
  blog: "blog / news",
  cms: "update content myself",
  email: "email accounts",
  whatsapp: "WhatsApp enquiries",
  "custom-app": "something custom (marketplace, portal, integrations)",
};

const RUN_LABELS: Record<WebsiteRequirements["runPreference"], string> = {
  managed: "managed (hosting + maintenance handled)",
  "once-off": "once-off (I handle running it)",
  unsure: "not sure yet",
};

const PRESENCE_LABELS: Record<WebsiteRequirements["presence"], string> = {
  none: "no website yet",
  "needs-work": "has a website but it needs work",
  "works-fine": "has a website that works",
};

const TYPE_LABELS: Record<WebsiteRequirements["businessType"], string> = {
  services: "services",
  retail: "retail",
  hospitality: "hospitality",
  professional: "professional",
  other: "other",
};

const LOCATION_LABELS: Record<WebsiteRequirements["location"], string> = {
  maboloka: "Maboloka",
  soshanguve: "Soshanguve",
  pretoria: "Pretoria / Tshwane",
  "elsewhere-sa": "elsewhere in South Africa",
  "outside-sa": "outside South Africa",
};

/**
 * Build the visitor-facing starter message summarising the stated
 * requirements. Always exceeds the contact schema's 10-character minimum.
 * When a promotion is applied to the recommendation, its name travels
 * with the enquiry so Mogen can confirm eligibility — pricing itself is
 * never trusted from the client and is re-confirmed by Mogen.
 */
export function buildWebsiteEnquiryMessage(
  req: WebsiteRequirements,
  recommendation: WebsiteRecommendation,
  promotionName?: string,
): string {
  const needs =
    req.needs.length > 0
      ? req.needs.map((n) => NEED_LABELS[n]).join(", ")
      : "no extra functionality selected";
  const display = recommendationPriceDisplay(recommendation);
  const price =
    display && recommendation.packageId
      ? ` (${[display.price, display.cadence].filter(Boolean).join(" ")})`
      : "";
  const outcome = recommendation.needsConsultation
    ? "The questionnaire suggested a tailored consultation (requirements outside the standard package scope)."
    : `The questionnaire suggested ${recommendation.packageId ? packageName(recommendation.packageId) : "a package"}${price} — to be confirmed by Mogen.${promotionName ? ` Active promotion shown: ${promotionName} (eligibility to be confirmed).` : ""}`;
  const presence =
    req.website.trim() !== ""
      ? `${PRESENCE_LABELS[req.presence]} (${req.website.trim()})`
      : PRESENCE_LABELS[req.presence];
  const businessType =
    req.businessType === "other" && req.otherBusinessType.trim() !== ""
      ? `other (${req.otherBusinessType.trim()})`
      : TYPE_LABELS[req.businessType];
  return [
    "Website requirements questionnaire:",
    `Goal: ${GOAL_LABELS[req.goal]}.`,
    `Current site: ${presence}.`,
    `Business type: ${businessType}.`,
    `Size: ${PAGE_LABELS[req.pageSize]}.`,
    `Functionality: ${needs}.`,
    `Running: ${RUN_LABELS[req.runPreference]}.`,
    `Location: ${LOCATION_LABELS[req.location]}.`,
    outcome,
    "Please confirm the right package and next steps.",
  ].join(" ");
}

function packageName(id: NonNullable<WebsiteRecommendation["packageId"]>): string {
  const pricing = getService("web-development")?.pricing ?? [];
  return pricing.find((p) => p.packageId === id)?.name ?? id;
}

export interface WebsiteEnquiryPayload {
  name: string;
  email: string;
  phone: string;
  businessName: string;
  service: string;
  /** Resolved package id, or "" for consultation (service-only context). */
  package: string;
  message: string;
  companyWebsite: string;
  attribution: EnquiryAttribution;
}

/**
 * Build the `POST /api/contact` body from questionnaire state.
 * Service identity comes from `data/services.ts` (never typed); the
 * package is the engine output re-validated server-side.
 */
export function buildWebsiteEnquiryPayload(input: {
  contact: QuestionnaireContact;
  requirements: WebsiteRequirements;
  recommendation: WebsiteRecommendation;
  attribution?: EnquiryAttribution;
  /** Name of the applied promotion, if any (eligibility unconfirmed). */
  promotionName?: string;
}): WebsiteEnquiryPayload {
  const service = getService("web-development")?.name ?? "Web Development";
  return {
    name: input.contact.name.trim(),
    email: input.contact.email.trim(),
    phone: input.contact.phone.trim(),
    businessName: input.contact.businessName.trim(),
    service,
    package: input.recommendation.packageId ?? "",
    message: buildWebsiteEnquiryMessage(
      input.requirements,
      input.recommendation,
      input.promotionName,
    ),
    companyWebsite: input.contact.companyWebsite,
    attribution: input.attribution ?? {},
  };
}
