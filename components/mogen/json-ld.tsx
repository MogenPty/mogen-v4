import { siteConfig } from "@/lib/site";

/**
 * Minimal, type-safe JSON-LD graph for the homepage.
 * Implements Organization → WebSite → WebPage with stable @id references.
 * Only includes verified properties — no fabricated business information.
 */
export default function JsonLd() {
  const organizationId = `${siteConfig.url}/#organization`;
  const websiteId = `${siteConfig.url}/#website`;
  const webpageId = `${siteConfig.url}/#webpage`;

  const graph = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Organization",
        "@id": organizationId,
        name: siteConfig.name,
        legalName: siteConfig.legalName,
        url: siteConfig.url,
        logo: `${siteConfig.url}${siteConfig.logo}`,
        description: siteConfig.description,
        email: siteConfig.email,
        telephone: siteConfig.telephone,
        // Minimal address — city/region/country only, no invented street
        address: {
          "@type": "PostalAddress",
          addressLocality: siteConfig.address.addressLocality,
          addressRegion: siteConfig.address.addressRegion,
          addressCountry: siteConfig.address.addressCountry,
        },
        // sameAs only when verified — intentionally empty if no repo-confirmed profile
        ...(siteConfig.sameAs.length > 0 ? { sameAs: siteConfig.sameAs } : {}),
      },
      {
        "@type": "WebSite",
        "@id": websiteId,
        url: siteConfig.url,
        name: siteConfig.name,
        description: siteConfig.description,
        publisher: { "@id": organizationId },
        inLanguage: siteConfig.lang,
      },
      {
        "@type": "WebPage",
        "@id": webpageId,
        url: `${siteConfig.url}/`,
        name: siteConfig.title,
        description: siteConfig.description,
        isPartOf: { "@id": websiteId },
        about: { "@id": organizationId },
        publisher: { "@id": organizationId },
        inLanguage: siteConfig.lang,
      },
    ],
  };

  return (
    <script
      type="application/ld+json"
      // biome-ignore lint/security/noDangerouslySetInnerHtml: No workaround for JSON-LD injection
      dangerouslySetInnerHTML={{ __html: JSON.stringify(graph) }}
    />
  );
}
