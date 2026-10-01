/**
 * Central service-package registry for the Mogen enquiry system.
 *
 * A package is a named offering that belongs to exactly one service:
 *
 *   promotion → package → service
 *
 * This registry is resolution-only: it maps identifiers so enquiry URLs
 * can carry the minimum context (`package=sprout`,
 * `promotion=mogen-sprout-first-100`) and the application infers the rest.
 * Package pricing/display lives with the service data and promotion data —
 * nothing is duplicated here.
 *
 * Identifiers follow the Task 7A vocabulary (`seed`, `sprout`,
 * `vegetative`, `ignition`). Unknown `package=` values resolve to
 * undefined — callers fall back to service-only or generic context.
 */

export interface ServicePackage {
  /** Stable URL identifier, e.g. `sprout`. Lowercase by convention. */
  id: string;
  /** Visitor-facing display name, e.g. `Sprout`. */
  name: string;
  /** Slug of the owning service in `data/services.ts`. */
  serviceSlug: string;
}

export const PACKAGES: ServicePackage[] = [
  { id: "seed", name: "Seed", serviceSlug: "web-development" },
  { id: "sprout", name: "Sprout", serviceSlug: "web-development" },
  { id: "vegetative", name: "Vegetative", serviceSlug: "web-development" },
  { id: "ignition", name: "Ignition", serviceSlug: "seo" },
  { id: "scale", name: "Scale", serviceSlug: "seo" },
  { id: "dominance", name: "Dominance", serviceSlug: "seo" },
  { id: "starter", name: "Starter", serviceSlug: "digital-marketing" },
  { id: "growth", name: "Growth", serviceSlug: "digital-marketing" },
  { id: "dominate", name: "Dominate", serviceSlug: "digital-marketing" },
  { id: "essential", name: "Essential", serviceSlug: "business-documentation" },
  { id: "standard", name: "Standard", serviceSlug: "business-documentation" },
  { id: "complete", name: "Complete", serviceSlug: "business-documentation" },
];

/** Resolve a package identifier to its registry entry (case-insensitive). */
export function getPackage(id: string | undefined): ServicePackage | undefined {
  const cleaned = id?.trim().toLowerCase();
  if (!cleaned) return undefined;
  return PACKAGES.find((p) => p.id === cleaned);
}
