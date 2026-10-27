/**
 * Central site configuration for Mogen v4.
 * All homepage identity, SEO, and branding values flow from here.
 * Do not invent business information — only values verified from repo or legacy site.
 *
 * The public site URL is environment-driven (Task 7B): the same build can
 * be deployed to another domain without modifying source code.
 * - Production: NEXT_PUBLIC_SITE_URL=https://www.mogen.co.za (or unset → default below)
 * - Development/preview: NEXT_PUBLIC_SITE_URL=https://mogen-v4.vercel.app
 */

/** Strip trailing slashes with a single linear scan (no regex backtracking). */
function stripTrailingSlashes(value: string): string {
  let end = value.length;
  while (end > 0 && value[end - 1] === "/") end--;
  return value.slice(0, end);
}

function resolveSiteUrl(): string {
  const trimmed = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  const fromEnv = trimmed ? stripTrailingSlashes(trimmed) : undefined;
  if (fromEnv) return fromEnv;
  return "https://www.mogen.co.za";
}

export function getSiteUrl(): string {
  return resolveSiteUrl();
}

export const siteConfig = {
  name: "Mogen",
  tradingName: "Mogen Pty Ltd",
  legalName: "Motsoane Global Enterprise (Pty) Ltd",
  // Canonical public URL — resolved from NEXT_PUBLIC_SITE_URL when set,
  // otherwise the production default. Never hardcode another host elsewhere;
  // always derive canonical/OG/sitemap/robots/JSON-LD URLs from siteConfig.url.
  url: resolveSiteUrl(),
  title: "Mogen | Digital Services for South African Businesses",
  description:
    "Mogen helps South African businesses grow with websites, SEO, digital marketing and business documentation. Based in Maboloka, serving Pretoria and Soshanguve.",
  locale: "en_ZA",
  // Language tag for Next.js html lang
  lang: "en",
  email: "info@mogen.co.za",
  legacyEmail: "hello@mogen.co.za",
  telephone: "+27718631884",
  telephoneDisplay: "+27 (0)71 863 1884",
  alternativeTelephone: "+27765207876",
  alternativeTelephoneDisplay: "+27 76 520 7876",
  whatsappNumber: "+27718631884",
  priceRange: "R99 - R32000",
  // Address — only city/region/country verified, no street invented
  address: {
    addressLocality: "Maboloka",
    addressRegion: "North West",
    addressCountry: "ZA",
    // Descriptive areas served — not a street address
    areaServed: [
      "Maboloka",
      "Brits",
      "North West",
      "Soshanguve",
      "Pretoria",
      "Centurion",
      "Gauteng",
      "South Africa",
    ],
  },
  // Official brand images (public/images/mogen/). These are the canonical
  // assets for logo, favicon, apple-touch and OG/Twitter sharing.
  logo: "/images/mogen/mogen-512x512.png",
  icon: "/images/mogen/mogen-fav-32x32.png",
  appleIcon: "/images/mogen/mogen-fav-180x180.png",
  ogImageOld: "/images/mogen/mogen-1200x450.png",
  ogImage: "/images/mogen/mogen-1200x630.png",
  ogImageWidth: 1200,
  ogImageHeight: 630,
  ogImageAlt: "MOGEN — Digital services for South African businesses",
  // Social profiles — ONLY verified via repo or official Mogen-owned profile.
  // Known evidence: https://za.linkedin.com/company/mogenpty exists but NOT confirmed in repo.
  // Therefore sameAs is deliberately empty to avoid fabricated structured data.
  // Add only when repository/project confirms official ownership.
  sameAs: [] as string[],
  // Ecosystem
  links: {
    store: "https://store.mogen.co.za",
    seo: "https://seo.mogen.co.za",
  },
} as const;

export type SiteConfig = typeof siteConfig;
