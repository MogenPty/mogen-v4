export interface Promotion {
  title: string;
  slug: string;
  description: string;
  originalPrice: number;
  promotionalPrice: number;
  currency: string;
  startDate?: string;
  endDate?: string;
  status: "active" | "scheduled" | "expired" | "draft";
  featured: boolean;
  showOnHomepage: boolean;
  relatedService: string;
  cta: { label: string; href: string };
  terms?: string;
}

export const PROMOTIONS: Promotion[] = [
  {
    title: "Mogen Seed Website",
    slug: "mogen-seed-website",
    description:
      "A focused starter website for businesses that need a professional online presence without unnecessary complexity. Clean structure, mobile-first build, and the essentials to get found and contacted.",
    originalPrice: 199,
    promotionalPrice: 99,
    currency: "ZAR",
    status: "active",
    featured: true,
    showOnHomepage: true,
    relatedService: "web-development",
    cta: { label: "Claim Mogen Seed", href: "/contact" },
    terms:
      "Promotion terms available on request. No fake expiry — price valid while promotion is active.",
  },
];

export const getActivePromotion = () =>
  PROMOTIONS.find((p) => p.status === "active" && p.showOnHomepage);

export const getPromotion = (slug: string) =>
  PROMOTIONS.find((p) => p.slug === slug);
