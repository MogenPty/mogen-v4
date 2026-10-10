import type { Metadata } from "next";
import { notFound } from "next/navigation";
import ServiceDetail from "@/components/mogen/service-detail";
import { getService, SERVICES } from "@/data/services";
import { siteConfig } from "@/data/site";
import { getRelatedArticlesForService } from "@/lib/articles/related";
import { parseEnquiryAttribution } from "@/lib/enquiry/enquiry";
import { pageMetadata } from "@/lib/seo";

interface Props {
  params: Promise<{ slug: string }>;
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}

export function generateStaticParams() {
  return SERVICES.map((s) => ({ slug: s.slug }));
}

// Related-article freshness (scheduled publications) without a redeploy:
// the collection regenerates at most hourly (see docs/articles.md).
export const revalidate = 3600;

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const service = getService(slug);
  if (!service) return { title: "Service not found" };
  return pageMetadata({
    path: `/services/${service.slug}`,
    title: service.name,
    description: service.tagline,
  });
}

function ServiceJsonLd({ slug }: Readonly<{ slug: string }>) {
  const service = getService(slug);
  if (!service) return null;
  const organizationId = `${siteConfig.url}/#organization`;
  const websiteId = `${siteConfig.url}/#website`;
  const pageUrl = `${siteConfig.url}/services/${service.slug}`;
  // Service schema mirrors visible content only: name, serviceType,
  // provider, areaServed and the page tagline. No ratings/prices invented.
  const graph = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Service",
        "@id": `${pageUrl}#service`,
        name: service.name,
        serviceType: service.name,
        description: service.tagline,
        url: pageUrl,
        provider: { "@id": organizationId },
        areaServed: siteConfig.address.areaServed,
      },
      {
        "@type": "WebPage",
        "@id": `${pageUrl}#webpage`,
        url: pageUrl,
        name: `${service.name} | ${siteConfig.name}`,
        description: service.tagline,
        isPartOf: { "@id": websiteId },
        about: { "@id": organizationId },
        publisher: { "@id": organizationId },
        inLanguage: siteConfig.lang,
      },
      {
        "@type": "BreadcrumbList",
        itemListElement: [
          {
            "@type": "ListItem",
            position: 1,
            name: "Home",
            item: `${siteConfig.url}/`,
          },
          {
            "@type": "ListItem",
            position: 2,
            name: "Services",
            item: `${siteConfig.url}/services`,
          },
          {
            "@type": "ListItem",
            position: 3,
            name: service.name,
            item: pageUrl,
          },
        ],
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

export default async function ServiceDetailPage({
  params,
  searchParams,
}: Readonly<Props>) {
  const { slug } = await params;
  // Invalid service slugs return the project 404 (with 404 status) rather
  // than a 200 "not found" panel — see Task 8 §14.
  if (!getService(slug)) notFound();
  // Carry allowlisted attribution (utm_*) from the service page URL into
  // enquiry CTAs — explicit service context always wins (see lib/enquiry).
  const attribution = parseEnquiryAttribution((await searchParams) ?? {});
  // Related articles come from the canonical published loader (drafts +
  // scheduled excluded); the client component only renders them.
  const relatedArticles = getRelatedArticlesForService(slug);

  return (
    <>
      <ServiceJsonLd slug={slug} />
      <ServiceDetail
        serviceSlug={slug}
        numbering={1}
        attribution={attribution}
        relatedArticles={relatedArticles}
      />
    </>
  );
}
