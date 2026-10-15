export interface Location {
  order: number;
  slug: string;
  name: string;
  presence: "physical" | "served";
  region: string;
  description: string;
  services: string[];
  href: string;
}

export const LOCATIONS: Location[] = [
  {
    order: 1,
    slug: "maboloka",
    name: "Maboloka",
    region: "North West - Head Office",
    presence: "physical",
    description:
      "Mogen is associated with Maboloka and serves businesses in the surrounding communities with practical digital services.",
    services: [
      "Web Development",
      "SEO",
      "Digital Marketing",
      "Business Documentation",
    ],
    href: "/locations/maboloka",
  },
  {
    order: 4,
    slug: "soshanguve",
    name: "Soshanguve",
    region: "Gauteng - Office",
    presence: "physical",
    description:
      "Mogen's full-service Soshanguve office in Block-Y — websites, online visibility, marketing and documentation with a local team.",
    services: [
      "Web Development",
      "SEO",
      "Digital Marketing",
      "Business Documentation",
    ],
    href: "/locations/soshanguve",
  },
  {
    order: 2,
    slug: "kgabalatsane",
    name: "Kgabalatsane",
    region: "North West - Gauteng Border",
    presence: "served",
    description:
      "Lifting Kgabalatsane with online presence that boosts their local businesses to a new height.",
    services: ["Web Development", "SEO", "Digital Marketing"],
    href: "/contact",
  },
  {
    order: 3,
    slug: "brits",
    name: "Brits",
    region: "North West",
    presence: "served",
    description:
      "Websites, local SEO and digital marketing for businesses across Brits — from CBD to surrounding suburbs.",
    services: ["Web Development", "SEO", "Digital Marketing"],
    href: "/contact",
  },
  {
    order: 5,
    slug: "pretoria",
    name: "Pretoria",
    region: "Gauteng",
    presence: "served",
    description:
      "Websites, local SEO and digital marketing for businesses across Pretoria — from CBD to surrounding suburbs.",
    services: ["Web Development", "SEO", "Digital Marketing"],
    href: "/contact",
  },
  {
    order: 7,
    slug: "centurion",
    name: "Centurion",
    region: "Gauteng - Office",
    presence: "physical",
    description:
      "Mogen's Centurion office in Monavoni, serving Centurion and the surrounding areas on all four services.",
    services: [
      "Web Development",
      "SEO",
      "Digital Marketing",
      "Business Documentation",
    ],
    href: "/locations/centurion",
  },
  {
    order: 6,
    slug: "north-west-gauteng-and-beyond",
    name: "North West, Gauteng & Beyond",
    region: "South Africa",
    presence: "served",
    description:
      "While rooted in Maboloka and Soshanguve, Mogen works with businesses more broadly across South Africa where remote delivery is appropriate.",
    services: [
      "Web Development",
      "SEO",
      "Digital Marketing",
      "Business Documentation",
    ],
    href: "/contact",
  },
];

/**
 * Office locations plus broader areas served.
 *
 * Mogen operates three offices: Maboloka (primary operating location),
 * Soshanguve and Centurion (office in Monavoni, serving Centurion and
 * the surrounding areas). Other entries in `LOCATIONS` below
 * describe areas served — clients or service availability elsewhere do
 * not imply a physical location, so no further detail pages are
 * generated. Only the slugs listed in `LOCATION_SLUGS` produce
 * `/locations/[slug]` pages; every other slug returns the project 404.
 *
 * Location facts (areas, office status, emails) are owner-provided.
 * Never invent street names or numbers — areas only.
 */
export interface LocationServiceLink {
  name: string;
  href: string;
}

export interface LocationActivity {
  title: string;
  body: string;
}

export interface LocationDetail {
  slug: string;
  name: string;
  /** Short area label, e.g. "Maboloka, North West". No street invented. */
  area: string;
  areaServed: string[];
  /** Location type/role, e.g. "Primary operating location". */
  role: string;
  /**
   * Physical presence vs served-area coverage. All three current offices
   * are physical; served-area pages (remote delivery only, no office
   * claimed) remain possible in future via `"served"`.
   */
  presence: "physical" | "served";
  /** Short page title — the root layout template appends `| Mogen`. */
  metaTitle: string;
  metaDescription: string;
  intro: string;
  /** What happens at this location. */
  activities: LocationActivity[];
  /** Service pages relevant to this location (existing v4 service routes). */
  services: LocationServiceLink[];
  /** Optional note clarifying how services relate to this location. */
  servicesNote?: string;
  /** Office email address for this location (owner-provided). */
  email: string;
  /** Locality/region for structured data — city/region/country only. */
  addressLocality: string;
  addressRegion: string;
}

export const LOCATION_DETAILS: Record<string, LocationDetail> = {
  maboloka: {
    slug: "maboloka",
    name: "Maboloka",
    area: "Tambo, Maboloka",
    areaServed: [
      "Maboloka",
      "Letlhabile",
      "Kgabalatsane",
      "Jericho",
      "Brits",
      "North West",
    ],
    role: "Head Office",
    presence: "physical",
    metaTitle:
      "Web Development, SEO, Digital Services & Business Documentation in Maboloka",
    metaDescription:
      "Mogen's primary operating location in Tambo, Maboloka — web development, SEO, digital marketing and business documentation. Visits by appointment.",
    intro:
      "Mogen's primary operating location in Tambo, Maboloka — web development, SEO, digital marketing and business documentation. Visits by appointment.",
    activities: [
      {
        title: "Web Development",
        body: "Design and development of fast, secure, responsive websites — performed from Maboloka.",
      },
      {
        title: "SEO Services",
        body: "Search visibility work, from on-page foundations to ongoing optimisation — performed from Maboloka.",
      },
      {
        title: "Digital Marketing",
        body: "Content, social and campaign work that puts businesses in front of the right people — performed from Maboloka.",
      },
      {
        title: "Technical & project development",
        body: "Broader technical and project work, alongside general Mogen operations — run from Maboloka.",
      },
    ],
    services: [
      { name: "Web Development", href: "/services/web-development" },
      { name: "SEO", href: "/services/seo" },
      { name: "Digital Marketing", href: "/services/digital-marketing" },
      {
        name: "Business Documentation",
        href: "/services/business-documentation",
      },
    ],
    servicesNote:
      "All four services are delivered from the primary Maboloka operation.",
    email: "maboloka@mogen.co.za",
    addressLocality: "Maboloka",
    addressRegion: "North West",
  },
  soshanguve: {
    slug: "soshanguve",
    name: "Soshanguve",
    area: "Block-Y, Soshanguve",
    areaServed: ["Soshanguve", "Mabopane", "Ga-Rankuwa", "Hebron", "Pretoria"],
    role: "Office",
    presence: "physical",
    metaTitle:
      "Web Development, SEO, Digital Services & Business Documentation in Soshanguve",
    metaDescription:
      "Mogen's Soshanguve office in Block-Y offers web development, SEO, digital marketing and business documentation, serving Soshanguve and the surrounding areas. Visits by appointment.",
    intro:
      "Soshanguve is a full-service Mogen office based in Block-Y. Businesses in Soshanguve and the surrounding areas work directly with the local team — from first enquiry to final delivery.",
    activities: [
      {
        title: "Web Development",
        body: "Fast, mobile-first websites for Soshanguve businesses — designed, built and supported by the local team, structured so nearby customers can find services and send enquiries.",
      },
      {
        title: "SEO Services",
        body: "Search visibility work for Soshanguve businesses, from on-page foundations and Google Business Profile setup to ongoing optimisation that compounds over time.",
      },
      {
        title: "Digital Marketing",
        body: "Content, social and campaign work that puts Soshanguve businesses in front of the right people — planned with the local team and reported in plain language.",
      },
      {
        title: "Business Documentation",
        body: "Typing, formatting, printing and preparation of professional business documents — policies, procedures, forms and templates — handled at the Soshanguve office.",
      },
    ],
    services: [
      { name: "Web Development", href: "/services/web-development" },
      { name: "SEO", href: "/services/seo" },
      { name: "Digital Marketing", href: "/services/digital-marketing" },
      {
        name: "Business Documentation",
        href: "/services/business-documentation",
      },
    ],
    servicesNote:
      "All four services are delivered by the Soshanguve team, serving Soshanguve and the surrounding areas.",
    email: "soshanguve@mogen.co.za",
    addressLocality: "Soshanguve",
    addressRegion: "Gauteng",
  },
  centurion: {
    slug: "centurion",
    name: "Centurion",
    area: "Monavoni, Centurion",
    areaServed: ["Centurion", "Pretoria", "Gauteng"],
    role: "Office",
    presence: "physical",
    metaTitle:
      "Web Development, SEO, Digital Services & Business Documentation in Centurion",
    metaDescription:
      "Mogen's Centurion office in Monavoni offers web development, SEO, digital marketing and business documentation, serving Centurion and the surrounding areas. Visits by appointment.",
    intro:
      "Mogen's Centurion office in Monavoni services Centurion and the surrounding areas across all four services — web development, SEO, digital marketing and business documentation — so local businesses work directly with people nearby, from first enquiry to final delivery.",
    activities: [
      {
        title: "Web Development",
        body: "Fast, mobile-first websites for Centurion businesses — service providers, contractors, practices and retailers — designed, built and supported by the Centurion team and structured to turn nearby searches into enquiries.",
      },
      {
        title: "SEO Services",
        body: "Search visibility for Centurion businesses, from on-page foundations and Google Business Profile setup to ongoing optimisation that compounds over time.",
      },
      {
        title: "Digital Marketing",
        body: "Content, social and campaign work that puts Centurion businesses in front of the right audience — planned with the local team and reported in plain language.",
      },
      {
        title: "Business Documentation",
        body: "Professional business documents for Centurion businesses — policies, procedures, forms and templates — drafted, formatted and delivered as print-ready and editable files.",
      },
    ],
    services: [
      { name: "Web Development", href: "/services/web-development" },
      { name: "SEO", href: "/services/seo" },
      { name: "Digital Marketing", href: "/services/digital-marketing" },
      {
        name: "Business Documentation",
        href: "/services/business-documentation",
      },
    ],
    servicesNote:
      "All four services are delivered by the Centurion team, serving Centurion and the surrounding areas.",
    email: "centurion@mogen.co.za",
    addressLocality: "Centurion",
    addressRegion: "Gauteng",
  },
};

/** Slugs that produce a `/locations/[slug]` page. Nothing else is added. */
export const LOCATION_SLUGS = Object.keys(LOCATION_DETAILS);

export function getLocationDetail(slug: string): LocationDetail | undefined {
  return LOCATION_DETAILS[slug];
}
