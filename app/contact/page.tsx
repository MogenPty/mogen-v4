import type { Metadata } from "next";
import Contact from "@/components/mogen/contact";
import { siteConfig } from "@/data/site";

const PAGE_URL = `${siteConfig.url}/contact`;

export const metadata: Metadata = {
  title: "Contact Mogen",
  description:
    "Contact Mogen — explain what you need. Mogen reviews every enquiry and replies within one business day with a practical next step.",
  alternates: {
    canonical: PAGE_URL,
  },
  robots: {
    index: true,
    follow: true,
  },
  openGraph: {
    type: "website",
    url: PAGE_URL,
    siteName: siteConfig.name,
    title: "Contact Mogen | Digital Services for South African Businesses",
    description:
      "Contact Mogen — explain what you need. Mogen reviews every enquiry and replies within one business day with a practical next step.",
    images: [
      {
        url: siteConfig.ogImage,
        width: siteConfig.ogImageWidth,
        height: siteConfig.ogImageHeight,
        alt: siteConfig.ogImageAlt,
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Contact Mogen | Digital Services for South African Businesses",
    description:
      "Contact Mogen — explain what you need. Mogen reviews every enquiry and replies within one business day with a practical next step.",
    images: [siteConfig.ogImage],
  },
};

function ContactJsonLd() {
  const organizationId = `${siteConfig.url}/#organization`;
  const websiteId = `${siteConfig.url}/#website`;
  const graph = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Organization",
        "@id": organizationId,
        name: siteConfig.name,
        url: siteConfig.url,
        logo: `${siteConfig.url}${siteConfig.logo}`,
        email: siteConfig.email,
        telephone: siteConfig.telephone,
        address: {
          "@type": "PostalAddress",
          addressLocality: siteConfig.address.addressLocality,
          addressRegion: siteConfig.address.addressRegion,
          addressCountry: siteConfig.address.addressCountry,
        },
      },
      {
        "@type": "WebSite",
        "@id": websiteId,
        url: siteConfig.url,
        name: siteConfig.name,
        publisher: { "@id": organizationId },
        inLanguage: siteConfig.lang,
      },
      {
        "@type": "ContactPage",
        "@id": `${PAGE_URL}#webpage`,
        url: PAGE_URL,
        name: "Contact Mogen | Digital Services for South African Businesses",
        description:
          "Contact Mogen — explain what you need. Mogen reviews every enquiry and replies within one business day.",
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

export default function ContactPage() {
  return (
    <>
      <ContactJsonLd />
      <Contact numbering={8} />
    </>
  );
}
