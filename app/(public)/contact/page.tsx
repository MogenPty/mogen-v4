import type { Metadata } from "next";
import Contact from "@/components/mogen/contact";
import { databaseCatalogueEnabled, loadPublicWebPriceOptions } from "@/lib/catalogue/server";
import { loadPromotionBySlug } from "@/lib/catalogue/promotions-server";
import { getEffectiveStatus } from "@/data/promotions";
import { PACKAGES } from "@/data/packages";
import { getPublishedWebPackages } from "@/db/catalogue";
import { getPublishedWebPackage, getPublishedWebPriceOption } from "@/db/catalogue";
import { isPublicWebPrice, type WebPriceOption } from "@/lib/catalogue/commercial";
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
  const context = parseEnquiryContext(resolvedSearchParams);
  const details = resolveEnquiryDetails(context);
  const catalogueEnabled = databaseCatalogueEnabled();
  // In database mode, Web Development choices come from published Neon rows.
  // Other service packages continue to use the backwards-compatible registry.
  const [publishedWebPackages, publishedPriceRows] = await Promise.all([catalogueEnabled ? getPublishedWebPackages() : Promise.resolve([]), loadPublicWebPriceOptions()]);
  const priceOptions = (publishedPriceRows ?? []).filter(option => option.amountCents !== null).map(option => ({ id: option.id, packageId: option.packageId, billingMode: option.billingMode, amountCents: option.amountCents as number, setupFeeCents: option.setupFeeCents, minimumMonths: option.minimumMonths, depositPercent: option.depositPercent, initialHostingMonths: option.initialHostingMonths, handoverPolicy: option.handoverPolicy }));
  const availablePackages = catalogueEnabled
    ? [
        ...PACKAGES.filter(pkg => pkg.serviceSlug !== "web-development"),
        ...publishedWebPackages.map(pkg => ({
          id: pkg.id, name: pkg.name, serviceSlug: "web-development",
        })),
      ]
    : PACKAGES;

  const campaignSlug = typeof resolvedSearchParams.promotion === "string" ? resolvedSearchParams.promotion : "";
  const candidateCampaign = catalogueEnabled && campaignSlug ? await loadPromotionBySlug(campaignSlug) : undefined;
  const liveCampaign = candidateCampaign && getEffectiveStatus(candidateCampaign) === "active"
    ? candidateCampaign : undefined;
  // A DB promotion's server-validated parent choice wins only when there is
  // no conflicting explicit package or billing option in the URL.
  const campaignMatches = liveCampaign &&
    (!context.package || context.package === liveCampaign.relatedPackage) &&
    (typeof resolvedSearchParams.priceOption !== "string" ||
      resolvedSearchParams.priceOption === liveCampaign.targetPriceOptionId);
  const approvedCampaign = campaignMatches ? liveCampaign : undefined;
  const requestedPackageId = approvedCampaign?.relatedPackage ?? context.package;
  const dbPackage = catalogueEnabled && requestedPackageId
    ? await getPublishedWebPackage(requestedPackageId)
    : undefined;
  // Do not preselect a draft/retired web package or a superseded web promotion.
  const selectedPackage = catalogueEnabled
    ? (dbPackage?.id ?? (details.package?.serviceSlug === "web-development" ? undefined : details.package?.id))
    : details.package?.id;
  const selectedService = dbPackage ? "Web Development" : details.serviceName;
  const requestedPriceOption = typeof resolvedSearchParams.priceOption === "string"
    ? resolvedSearchParams.priceOption : undefined;
  const effectivePriceOptionId = requestedPriceOption ?? approvedCampaign?.targetPriceOptionId;
  const priceOption = catalogueEnabled && dbPackage && effectivePriceOptionId
    ? await getPublishedWebPriceOption(effectivePriceOptionId) : undefined;
  const selectedPriceOption = priceOption && dbPackage &&
    priceOption.packageId === dbPackage.id &&
    isPublicWebPrice(priceOption as WebPriceOption, new Set([dbPackage.id]))
      ? priceOption.id : undefined;
  const priceModeLabels: Record<string, string> = {
    managed_monthly: "Managed Monthly",
    managed_annual: "Managed Annually",
    once_off: "Once-Off",
    self_hosted: "Self-Hosted",
  };
  const selectedPriceOptionLabel = selectedPriceOption && priceOption
    ? priceModeLabels[priceOption.billingMode] : undefined;
  const supersededPromotion = catalogueEnabled &&
    details.promotion?.relatedService === "web-development";
  return (
    <>
      <ContactJsonLd />
      <Contact
        numbering={8}
        initialService={selectedService}
        initialPackage={selectedPackage}
        initialPriceOption={selectedPriceOption}
        initialPriceOptionLabel={selectedPriceOptionLabel}
        initialMessage={
          (approvedCampaign ? `I am interested in the ${approvedCampaign.name} promotion. Please confirm eligibility and the final quotation.` : supersededPromotion ? undefined : details.message) ?? buildAuditEnquiryMessage(details.website)
        }
        initialPromotionName={approvedCampaign?.name ?? (supersededPromotion ? undefined : details.promotion?.name)}
        initialServiceNotice={supersededPromotion ? undefined : details.serviceNotice}
        initialPackageNotice={supersededPromotion ? undefined : details.packageNotice}
        initialAttribution={details.attribution}
        availablePackages={availablePackages}
        availablePriceOptions={priceOptions}
      />
    </>
  );
}
