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
    href: "/contact",
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
    href: "/contact",
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
