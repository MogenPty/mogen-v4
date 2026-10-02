import type { Metadata } from "next";
import { notFound } from "next/navigation";
import LocationDetail from "@/components/mogen/location-detail";
import { getLocationDetail, LOCATION_SLUGS } from "@/data/locations";
import { siteConfig } from "@/data/site";
import { pageMetadata } from "@/lib/seo";

interface Props {
  params: Promise<{ slug: string }>;
}

export function generateStaticParams() {
  return LOCATION_SLUGS.map((slug) => ({ slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const location = getLocationDetail(slug);
  if (!location) return { title: "Location not found" };
  return pageMetadata({
    path: `/locations/${location.slug}`,
    title: location.metaTitle,
    description: location.metaDescription,
  });
}

function LocationJsonLd({ slug }: Readonly<{ slug: string }>) {
  const location = getLocationDetail(slug);
  if (!location) return null;
  const organizationId = `${siteConfig.url}/#organization`;
  const websiteId = `${siteConfig.url}/#website`;
  const pageUrl = `${siteConfig.url}/locations/${location.slug}`;
  // Place schema mirrors visible content only: name, description, url and
  // a city/region/country address. No street, geo, hours or ratings invented.
  const graph = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Place",
        "@id": `${pageUrl}#place`,
        name: `Mogen in ${location.name}`,
        description: location.metaDescription,
        url: pageUrl,
        address: {
          "@type": "PostalAddress",
          addressLocality: location.addressLocality,
          addressRegion: location.addressRegion,
          addressCountry: siteConfig.address.addressCountry,
        },
      },
      {
        "@type": "WebPage",
        "@id": `${pageUrl}#webpage`,
        url: pageUrl,
        name: `${location.metaTitle} | ${siteConfig.name}`,
        description: location.metaDescription,
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
            name: location.name,
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

export default async function LocationPage({ params }: Readonly<Props>) {
  const { slug } = await params;
  // Only Maboloka and Soshanguve exist as physical locations — any other
  // slug returns the project 404 (with 404 status) rather than a 200 panel.
  if (!getLocationDetail(slug)) notFound();

  return (
    <>
      <LocationJsonLd slug={slug} />
      <LocationDetail locationSlug={slug} numbering={1} />
    </>
  );
}
