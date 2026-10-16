import type { Metadata } from "next";
import Contact from "@/components/mogen/contact";
import { siteConfig } from "@/data/site";
import {
  buildAuditEnquiryMessage,
  parseEnquiryContext,
  resolveEnquiryDetails,
} from "@/lib/enquiry/enquiry";
import { pageMetadata } from "@/lib/seo";
import { STATIC_META } from "@/lib/seo/metadata-registry";

const PAGE_URL = `${siteConfig.url}/contact`;

export const metadata: Metadata = pageMetadata({
  path: "/contact",
  title: STATIC_META["/contact"].title,
  description: STATIC_META["/contact"].description,
});

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

export default async function ContactPage({
  searchParams,
}: Readonly<{
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}>) {
  // Server-side resolution: the page stays a Server Component and the
  // Client form below receives plain initial values (no useSearchParams,
  // so no extra Suspense boundary is required).
  const resolvedSearchParams = (await searchParams) ?? {};
  const details = resolveEnquiryDetails(
    parseEnquiryContext(resolvedSearchParams),
  );
  return (
    <>
      <ContactJsonLd />
      <Contact
        numbering={8}
        initialService={details.serviceName}
        initialPackage={details.package?.id}
        initialMessage={
          details.message ?? buildAuditEnquiryMessage(details.website)
        }
        initialPromotionName={details.promotion?.name}
        initialServiceNotice={details.serviceNotice}
        initialPackageNotice={details.packageNotice}
        initialAttribution={details.attribution}
      />
    </>
  );
}
