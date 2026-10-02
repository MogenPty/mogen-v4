export interface Location {
  order: number;
  slug: string;
  name: string;
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
    region: "Gauteng - Satellite Office",
    description:
      "Supporting Soshanguve businesses with clear, mobile-first websites and online visibility that reaches nearby customers.",
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
    description:
      "Websites, local SEO and digital marketing for businesses across Pretoria — from CBD to surrounding suburbs.",
    services: ["Web Development", "SEO", "Digital Marketing"],
    href: "/contact",
  },
  {
    order: 6,
    slug: "north-west-gauteng-and-beyond",
    name: "North West, Gauteng & Beyond",
    region: "South Africa",
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
 * Physical/operational presence only.
 *
 * Mogen has two physical locations: Maboloka (primary operating location)
 * and Soshanguve (satellite office). Other entries in `LOCATIONS` above
 * describe areas served — clients or service availability elsewhere do not
 * imply a physical location, so no further detail pages are generated.
 * Only the slugs listed in `LOCATION_SLUGS` produce `/locations/[slug]`
 * pages; every other slug returns the project 404.
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
  /** Location type/role, e.g. "Primary operating location". */
  role: string;
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
  /** Locality/region for structured data — city/region/country only. */
  addressLocality: string;
  addressRegion: string;
}

export const LOCATION_DETAILS: Record<string, LocationDetail> = {
  maboloka: {
    slug: "maboloka",
    name: "Maboloka",
    area: "Maboloka, North West",
    role: "Primary operating location",
    metaTitle: "Mogen in Maboloka",
    metaDescription:
      "Maboloka, North West is Mogen's primary operating location — web development, SEO, digital marketing and business documentation. Visits by appointment.",
    intro:
      "Maboloka, North West is Mogen's primary operating location. This is where Mogen's main technical and operational work is performed.",
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
    addressLocality: "Maboloka",
    addressRegion: "North West",
  },
  soshanguve: {
    slug: "soshanguve",
    name: "Soshanguve",
    area: "Soshanguve, Gauteng",
    role: "Satellite office",
    metaTitle: "Mogen in Soshanguve",
    metaDescription:
      "Mogen's Soshanguve satellite office supports Business Documentation — typing, printing, related documentation work and client progress reviews. Visits by appointment.",
    intro:
      "Soshanguve is a Mogen satellite office with an active Business Documentation presence. Web development, SEO and digital marketing are primarily performed from Maboloka.",
    activities: [
      {
        title: "Content typing",
        body: "Typing and preparation of business document content at the Soshanguve satellite office.",
      },
      {
        title: "Printing",
        body: "Print preparation and handling connected to Business Documentation projects.",
      },
      {
        title: "Related documentation work",
        body: "Supporting documentation tasks — formatting, structuring and related project work.",
      },
      {
        title: "Client progress reviews",
        body: "Clients can review the progress of their Business Documentation projects at the satellite office.",
      },
    ],
    services: [
      {
        name: "Business Documentation",
        href: "/services/business-documentation",
      },
      { name: "Web Development", href: "/services/web-development" },
      { name: "SEO", href: "/services/seo" },
      { name: "Digital Marketing", href: "/services/digital-marketing" },
    ],
    servicesNote:
      "Business Documentation is supported at the Soshanguve satellite office, with technical and design assistance from Mogen. Web development, SEO and digital marketing are primarily performed from Maboloka.",
    addressLocality: "Soshanguve",
    addressRegion: "Gauteng",
  },
};

/** Slugs that produce a `/locations/[slug]` page. Nothing else is added. */
export const LOCATION_SLUGS = Object.keys(LOCATION_DETAILS);

export function getLocationDetail(slug: string): LocationDetail | undefined {
  return LOCATION_DETAILS[slug];
}
