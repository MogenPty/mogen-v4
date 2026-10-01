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

function resolveSiteUrl(): string {
  const fromEnv = process.env.NEXT_PUBLIC_SITE_URL?.trim().replace(/\/+$/, "");
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
  // Staging URL (for reference only — never used as canonical)
  stagingUrl: "https://mogen-v4.vercel.app",
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
  // Address — only city/region/country verified, no street invented
  address: {
    addressLocality: "Brits",
    addressRegion: "North West",
    addressCountry: "ZA",
    // Descriptive areas served — not a street address
    areaServed: [
      "Maboloka",
      "Brits",
      "North West",
      "Soshanguve",
      "Pretoria",
      "Gauteng",
      "South Africa",
    ],
  },
  // Logo / icon assets — created as part of this task from MOGEN wordmark
  // No external logo file existed in repo; icons are minimal SVG wordmarks
  logo: "/icon.svg",
  icon: "/icon.svg",
  appleIcon: "/apple-icon.svg",
  // OG image — no dedicated OG image existed; using brand icon as fallback.
  // A dedicated 1200x630 OG image would improve sharing appearance later.
  ogImage: "/icon.svg",
  ogImageWidth: 512,
  ogImageHeight: 512,
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
