export interface Location {
  slug: string;
  name: string;
  region: string;
  description: string;
  services: string[];
  href: string;
}

export const LOCATIONS: Location[] = [
  {
    slug: "maboloka",
    name: "Maboloka",
    region: "North West · Gauteng border",
    description:
      "Mogen is associated with Maboloka and serves businesses in the surrounding communities with practical digital services.",
    services: ["Web Development", "SEO", "Digital Marketing", "Business Documentation"],
    href: "/contact",
  },
  {
    slug: "pretoria",
    name: "Pretoria",
    region: "Gauteng",
    description:
      "Websites, local SEO and digital marketing for businesses across Pretoria — from CBD to surrounding suburbs.",
    services: ["Web Development", "SEO", "Digital Marketing", "Business Documentation"],
    href: "/contact",
  },
  {
    slug: "soshanguve",
    name: "Soshanguve",
    region: "Gauteng",
    description:
      "Supporting Soshanguve businesses with clear, mobile-first websites and online visibility that reaches nearby customers.",
    services: ["Web Development", "SEO", "Digital Marketing", "Business Documentation"],
    href: "/contact",
  },
  {
    slug: "gauteng",
    name: "Gauteng & Beyond",
    region: "South Africa",
    description:
      "While rooted in Maboloka and Pretoria, Mogen works with businesses more broadly across South Africa where remote delivery is appropriate.",
    services: ["Web Development", "SEO", "Digital Marketing", "Business Documentation"],
    href: "/contact",
  },
];
