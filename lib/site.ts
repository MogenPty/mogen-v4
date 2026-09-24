/**
 * Central site configuration for Mogen v4.
 * All homepage identity, SEO, and branding values flow from here.
 * Do not invent business information — only values verified from repo or legacy site.
 */

export const siteConfig = {
  name: "Mogen",
  tradingName: "Mogen Pty Ltd",
  legalName: "Motsoane Global Enterprise (Pty) Ltd",
  // Production canonical — Vercel deployment must NEVER become canonical
  url: "https://www.mogen.co.za",
  // Staging URL (for reference only — never used as canonical)
  stagingUrl: "https://mogen-v4.vercel.app",
  title: "Mogen | Digital Services for South African Businesses",
  description:
    "Mogen is a South African digital services business based in Maboloka, serving Pretoria, Soshanguve and Gauteng. We provide web development, SEO, digital marketing and business documentation for businesses ready to grow.",
  locale: "en_ZA",
  // Language tag for Next.js html lang
  lang: "en",
  email: "info@mogen.co.za",
  telephone: "+27718631884",
  telephoneDisplay: "+27 (0)71 863 1884",
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
