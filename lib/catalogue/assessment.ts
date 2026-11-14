import type { CatalogueWebPackage } from "./location-offer";

export type AssessmentPageSize = "one" | "small" | "medium" | "large" | "extended" | "custom" | "unsure";
export type AssessmentPresence = "none" | "needs-work" | "works-fine";
export type AssessmentGoal = "enquiries" | "sales" | "bookings" | "info";
export type AssessmentRunMode = "managed_monthly" | "managed_annual" | "self_hosted" | "unsure";

export interface AssessmentAnswers {
  presence: AssessmentPresence;
  website: string;
  businessType: string;
  otherBusinessType: string;
  goal: AssessmentGoal;
  pageSize: AssessmentPageSize;
  needs: string[];
  runMode: AssessmentRunMode;
  location: string;
}
export const INITIAL_ASSESSMENT: AssessmentAnswers = {
  presence: "none", website: "", businessType: "services", otherBusinessType: "",
  goal: "enquiries", pageSize: "unsure", needs: [], runMode: "unsure", location: "",
};

/** Never recommend a lower tier than the required scope; custom work is quoted. */
export function recommendAssessmentPackage(packages: readonly CatalogueWebPackage[], answers: AssessmentAnswers): CatalogueWebPackage | undefined {
  const needs = new Set(answers.needs);
  let stage = 2;
  if (needs.has("custom-app") || answers.pageSize === "custom") stage = 7;
  else if (needs.has("ecommerce") || needs.has("booking") || answers.goal === "bookings" || answers.goal === "sales") stage = 6;
  else if (answers.pageSize === "extended") stage = 6;
  else if (answers.pageSize === "large") stage = 5;
  else if (answers.pageSize === "medium" || needs.has("cms") || needs.has("blog")) stage = 4;
  else if (answers.pageSize === "small") stage = 3;
  return packages.filter(p => p.status === "published" && p.websiteIncluded)
    .sort((a, b) => a.stage - b.stage).find(p => p.stage >= stage);
}

const presence = { none: "no website", "needs-work": "existing website needs work", "works-fine": "existing website works" };
const goal = { enquiries: "customer enquiries", sales: "online sales", bookings: "bookings", info: "business information" };
const sizes = { one: "one landing page", small: "2–5 pages", medium: "6–10 pages", large: "11–15 pages", extended: "16–25 pages", custom: "custom/more than 25 pages", unsure: "unsure" };
const run = { managed_monthly: "monthly managed", managed_annual: "annual managed", self_hosted: "self-hosted", unsure: "not sure yet" };

export function assessmentEnquiryMessage(answers: AssessmentAnswers, packageName: string, priceDescription?: string): string {
  return [
    "Website Assessment enquiry:",
    `Current presence: ${presence[answers.presence]}.`,
    `Existing website: ${answers.website || "not supplied"}.`,
    `Business type: ${answers.businessType === "other" ? answers.otherBusinessType || "other" : answers.businessType}.`,
    `Goal: ${goal[answers.goal]}.`,
    `Website size: ${sizes[answers.pageSize]}.`,
    `Desired features: ${answers.needs.length ? answers.needs.join(", ") : "standard website"}.`,
    `Payment preference: ${run[answers.runMode]}.`,
    `Location: ${answers.location || "not specified"}.`,
    `Recommended starting point: ${packageName}${priceDescription ? ` (${priceDescription})` : ""}.`,
    "Please discuss requirements and confirm scope and quotation before proceeding.",
  ].join(" ");
}
