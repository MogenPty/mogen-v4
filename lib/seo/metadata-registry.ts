import { getAllArticles } from "@/lib/articles/loader";
import { getTagArchives } from "@/lib/articles/tags";
import { LOCATION_DETAILS, LOCATION_SLUGS } from "@/data/locations";
import { getPublicPromotions } from "@/data/promotions";
import { SERVICES } from "@/data/services";

/**
 * Canonical metadata registry (SEO remediation — metadata quality).
 *
 * Single source of truth for indexable-route metadata AFTER template
 * inheritance is resolved. Static pages consume STATIC_META so tests
 * assert the values actually served, not brittle source snippets.
 *
 * Conventions:
 * - `title` is the short page title. The root layout appends ` | Mogen`
 *   via its title template, unless `absoluteTitle` is set (homepage).
 * - Character counts use JavaScript string length (UTF-16 code units).
 * - Preferred ranges: title 50–60, description 150–160. These are
 *   editorial targets, not ranking guarantees — see docs.
 */

export const TITLE_MAX = 60;
export const TITLE_MIN = 50;
export const DESCRIPTION_MAX = 160;
export const DESCRIPTION_MIN = 150;
export const TITLE_SUFFIX = " | Mogen";

export interface StaticMeta {
  /** Public pathname. */
  path: string;
  /** Short title (suffix appended unless absoluteTitle). */
  title: string;
  description: string;
  /** When true, `title` is used verbatim (no layout suffix). */
  absoluteTitle?: boolean;
  /** Explicit noindex — excluded from SEO compliance checks. */
  noindex?: boolean;
  /**
   * Documented exception for a short title/description that is
   * deliberately concise (legal pages, promo names). Named routes only.
   */
  exception?: string;
}

export const STATIC_META: Record<string, StaticMeta> = {
  "/": {
    path: "/",
    title: "Mogen | Web Development for South African Businesses",
    description:
      "Mogen builds fast websites for South African businesses — with SEO, marketing and documentation to help you grow.",
    absoluteTitle: true,
  },
  "/about": {
    path: "/about",
    title: "Web Development Agency for South African Business",
    description:
      "Mogen is a South African web development business in Maboloka — websites, SEO, marketing and documentation for local businesses.",
  },
  "/contact": {
    path: "/contact",
    title: "Request a Website Quote or Ask About Our Services",
    description:
      "Contact Mogen — explain what you need. Mogen reviews every enquiry and replies within one business day with a practical next step.",
  },
  "/articles": {
    path: "/articles",
    title: "Articles & Practical Growth Advice for SA Business",
    description:
      "Industry articles and practical growth advice for South African businesses — local SEO, websites, Google Business Profile and conversion.",
  },
  "/faq": {
    path: "/faq",
    title: "Website, SEO & Business Document FAQs Answered",
    description:
      "Answers on Mogen websites, SEO, marketing and documentation — timelines, pricing pointers, process and next steps.",
  },
  "/services": {
    path: "/services",
    title: "Website Development, SEO & Marketing Services",
    description:
      "Four services, clearly scoped — Web Development, SEO, Digital Marketing and Business Documentation. Each a distinct offering so you know what you pay for.",
  },
  "/pricing": {
    path: "/pricing",
    title: "Website, SEO & Marketing Pricing for SA Business",
    description:
      "Mogen pricing for websites, SEO, marketing and documentation — three tiers per service. See each service page for details.",
  },
  "/process": {
    path: "/process",
    title: "Our Process: From Invisible to In-Demand Websites",
    description:
      "How Mogen works — discover, architect, build and grow. A deliberate process that takes local businesses from invisible to in-demand.",
  },
  "/promotions": {
    path: "/promotions",
    title: "Current Website Deals & Limited SA Promotions",
    description:
      "Current and past Mogen promotions — limited offers on websites and managed subscriptions, with clear pricing, eligibility and terms.",
  },
  "/resources": {
    path: "/resources",
    title: "Free SEO & Website Playbooks for SA Business",
    description:
      "Free playbooks, checklists and templates for South African businesses — local SEO, landing pages, growth audits and Google Business Profile.",
  },
  "/partners": {
    path: "/partners",
    title: "Trusted Software Partners & Recommended Tools",
    description:
      "Software partners and recommended tools Mogen uses alongside its services to compound client results.",
  },
  "/success-stories": {
    path: "/success-stories",
    title: "Website Structures That Turn Visits Into Enquiries",
    description:
      "How Mogen approaches hospitality, clinic, service and retail sites — structure, local relevance and clear enquiry paths.",
  },
  "/privacy-policy": {
    path: "/privacy-policy",
    title: "Privacy Policy",
    description:
      "How Mogen collects, uses and protects personal information shared through forms and the Growth Audit, in line with POPIA.",
    exception:
      "Legal page — concise title is appropriate; no keyword elaboration.",
  },
  "/terms-of-service": {
    path: "/terms-of-service",
    title: "Terms of Service",
    description:
      "The terms governing Mogen's web development, documentation, SEO and marketing services under South African law.",
    exception:
      "Legal page — concise title is appropriate; no keyword elaboration.",
  },
  "/locations": {
    path: "/locations",
    title: "Our Offices & Service Areas in South Africa",
    description:
      "Mogen offices in Maboloka, Soshanguve and Centurion — websites, SEO, marketing and documentation for Gauteng and North West.",
  },
  "/growth-audit-results": {
    path: "/growth-audit-results",
    title: "Growth Audit Results",
    description:
      "Your personalised Mogen Growth Audit result. Run a free audit to see your score.",
    noindex: true,
  },
};

/** Final rendered title after layout-template inheritance. */
export function finalTitle(meta: Pick<StaticMeta, "title" | "absoluteTitle">): string {
  if (meta.absoluteTitle) return meta.title;
  return `${meta.title}${TITLE_SUFFIX}`;
}

export type RouteKind =
  | "static"
  | "service"
  | "location"
  | "article"
  | "promotion"
  | "tag-archive";

export interface RouteRecord {
  path: string;
  kind: RouteKind;
  /** Final title as rendered (template already applied). */
  title: string;
  description: string;
  indexable: boolean;
  /** Named-route exception; tag archives use warnings instead. */
  exception?: string;
}

/**
 * Every public, indexable route with its FINAL metadata.
 * Dynamic routes resolve from live data sources (services, locations,
 * articles, promotions, tag archives) — the same sources the pages use.
 */
export function buildRouteInventory(): RouteRecord[] {
  const routes: RouteRecord[] = [];

  for (const meta of Object.values(STATIC_META)) {
    routes.push({
      path: meta.path,
      kind: "static",
      title: finalTitle(meta),
      description: meta.description,
      indexable: !meta.noindex,
      exception: meta.exception,
    });
  }

  for (const service of SERVICES) {
    routes.push({
      path: `/services/${service.slug}`,
      kind: "service",
      title: `${service.metaTitle}${TITLE_SUFFIX}`,
      description: service.metaDescription,
      indexable: true,
    });
  }

  for (const slug of LOCATION_SLUGS) {
    const location = LOCATION_DETAILS[slug];
    if (!location) continue;
    routes.push({
      path: `/locations/${location.slug}`,
      kind: "location",
      title: `${location.metaTitle}${TITLE_SUFFIX}`,
      description: location.metaDescription,
      indexable: true,
    });
  }

  for (const article of getAllArticles()) {
    routes.push({
      path: `/articles/${article.slug}`,
      kind: "article",
      title: `${article.title}${TITLE_SUFFIX}`,
      description: article.description,
      indexable: true,
    });
  }

  for (const promo of getPublicPromotions()) {
    routes.push({
      path: `/promotions/${promo.slug}`,
      kind: "promotion",
      title: `${promo.name}${TITLE_SUFFIX}`,
      description: promo.shortDescription,
      indexable: true,
      exception:
        "Promotion names are short by nature; the offer detail lives in the description.",
    });
  }

  // Tag archives: thin (single-article) archives are noindex by page logic
  // (app/articles/tag/[tag]/page.tsx) and excluded from compliance here.
  const archives = getTagArchives(getAllArticles());
  for (const archive of archives.values()) {
    const short = `Articles tagged "${archive.label}"`;
    routes.push({
      path: `/articles/tag/${archive.slug}`,
      kind: "tag-archive",
      title: `${short}${TITLE_SUFFIX}`,
      description: `Published Mogen articles tagged ${archive.label} — practical growth advice for South African businesses.`,
      indexable: archive.articles.length >= 2,
    });
  }

  return routes;
}

export interface MetadataIssue {
  path: string;
  field: "title" | "description";
  actual: number;
  limit: "max" | "min" | "empty" | "duplicate" | "malformed";
  message: string;
}

export interface ValidationResult {
  errors: MetadataIssue[];
  warnings: MetadataIssue[];
}

const TEMPLATE_TOKENS = ["%s", "{{", "}}", "undefined", "null", "[object Object]"];

/** Validate final metadata for indexable routes (warnings never fail). */
export function validateRoutes(routes: RouteRecord[]): ValidationResult {
  const errors: MetadataIssue[] = [];
  const warnings: MetadataIssue[] = [];
  const indexable = routes.filter((r) => r.indexable);

  const titleCounts = new Map<string, number>();
  const descCounts = new Map<string, number>();
  for (const r of indexable) {
    titleCounts.set(r.title, (titleCounts.get(r.title) ?? 0) + 1);
    descCounts.set(r.description, (descCounts.get(r.description) ?? 0) + 1);
  }

  for (const r of indexable) {
    const fail = (issue: MetadataIssue) => errors.push(issue);
    const warn = (issue: MetadataIssue) => warnings.push(issue);

    // Empty metadata always fails.
    if (!r.title.trim()) {
      fail({
        path: r.path,
        field: "title",
        actual: 0,
        limit: "empty",
        message: `${r.path}: empty title — every indexable page needs a title.`,
      });
    }
    if (!r.description.trim()) {
      fail({
        path: r.path,
        field: "description",
        actual: 0,
        limit: "empty",
        message: `${r.path}: empty meta description — every indexable page needs a description.`,
      });
    }

    // Malformed template output always fails.
    for (const token of TEMPLATE_TOKENS) {
      if (r.title.includes(token) || r.description.includes(token)) {
        fail({
          path: r.path,
          field: r.title.includes(token) ? "title" : "description",
          actual: token.length,
          limit: "malformed",
          message: `${r.path}: unresolved template token "${token}" in final metadata.`,
        });
      }
    }

    // Over-limit always fails.
    if (r.title.length > TITLE_MAX) {
      fail({
        path: r.path,
        field: "title",
        actual: r.title.length,
        limit: "max",
        message: `${r.path}: title is ${r.title.length} characters (max ${TITLE_MAX}).`,
      });
    }
    if (r.description.length > DESCRIPTION_MAX) {
      fail({
        path: r.path,
        field: "description",
        actual: r.description.length,
        limit: "max",
        message: `${r.path}: meta description is ${r.description.length} characters (max ${DESCRIPTION_MAX}).`,
      });
    }

    // Duplicate final titles fail (ambiguous in SERPs); duplicate
    // descriptions are flagged for manual review (warning only).
    if ((titleCounts.get(r.title) ?? 0) > 1) {
      fail({
        path: r.path,
        field: "title",
        actual: r.title.length,
        limit: "duplicate",
        message: `${r.path}: duplicate final title "${r.title}" — titles must be unique.`,
      });
    }
    if ((descCounts.get(r.description) ?? 0) > 1) {
      warn({
        path: r.path,
        field: "description",
        actual: r.description.length,
        limit: "duplicate",
        message: `${r.path}: duplicate meta description — review manually.`,
      });
    }

    // Below-range warns only. Short titles with a documented named-route
    // exception stay silent; tag-archive labels are dynamic by nature.
    if (r.title.length < TITLE_MIN && !r.exception && r.kind !== "tag-archive") {
      warn({
        path: r.path,
        field: "title",
        actual: r.title.length,
        limit: "min",
        message: `${r.path}: title is ${r.title.length} characters (preferred ${TITLE_MIN}–${TITLE_MAX}).`,
      });
    }
    if (r.description.length < DESCRIPTION_MIN) {
      warn({
        path: r.path,
        field: "description",
        actual: r.description.length,
        limit: "min",
        message: `${r.path}: meta description is ${r.description.length} characters (preferred ${DESCRIPTION_MIN}–${DESCRIPTION_MAX}).`,
      });
    }
  }

  return { errors, warnings };
}
