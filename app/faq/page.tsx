import type { Metadata } from "next";
import Link from "next/link";
import BlueprintGrid, { SectionLabel } from "@/components/mogen/blueprint-grid";
import MagneticButton from "@/components/mogen/magnet-button";
import PageShell from "@/components/mogen/page-shell";
import ServiceFAQ from "@/components/mogen/service-faq";
import { SERVICES } from "@/data/services";
import { siteConfig } from "@/data/site";
import { pageMetadata } from "@/lib/seo";
import { STATIC_META } from "@/lib/seo/metadata-registry";

export const metadata: Metadata = pageMetadata({
  path: "/faq",
  title: STATIC_META["/faq"].title,
  description: STATIC_META["/faq"].description,
});

// Service FAQs change rarely; hourly regeneration keeps the directory,
// sitemap and service-page backlinks consistent without a redeploy.
export const revalidate = 3600;

function FaqJsonLd() {
  const pageUrl = `${siteConfig.url}/faq`;
  const mainEntity = SERVICES.flatMap((service) =>
    (service.faq ?? []).map((item) => ({
      "@type": "Question",
      name: `${item.question} (${service.name})`,
      acceptedAnswer: {
        "@type": "Answer",
        text: item.answer,
      },
    })),
  );
  const graph = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "FAQPage",
        "@id": `${pageUrl}#faq`,
        url: pageUrl,
        mainEntity,
      },
      {
        "@type": "WebPage",
        "@id": `${pageUrl}#webpage`,
        url: pageUrl,
        name: `Frequently Asked Questions | ${siteConfig.name}`,
        description:
          "Answers to common questions about Mogen's services — timelines, process, pricing pointers and next steps.",
        isPartOf: { "@id": `${siteConfig.url}/#website` },
        about: { "@id": `${siteConfig.url}/#organization` },
        publisher: { "@id": `${siteConfig.url}/#organization` },
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
            name: "Frequently Asked Questions",
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

export default function FaqDirectoryPage() {
  return (
    <>
      <FaqJsonLd />
      <PageShell
        index="// 01 — FAQ"
        label="Questions, Answered"
        title={
          <>
            Frequently asked
            <span className="text-catalyst"> questions.</span>
          </>
        }
        intro="Short answers about timelines, process and working with Mogen — grouped by service. Package prices live on each service page; this directory points you there rather than duplicating them."
      >
        {SERVICES.map((service, i) => (
          <BlueprintGrid
            key={service.slug}
            className={i % 2 === 0 ? "bg-secondary py-24 lg:py-32" : "bg-bone py-24 lg:py-32"}
          >
            <div className="mx-auto max-w-225 px-6 lg:px-10">
              <SectionLabel
                index={`// ${String(i + 2).padStart(2, "0")} — ${service.name}`}
                title={service.name}
              />
              <h2 className="mb-6 font-display text-3xl font-black text-ink lg:text-4xl text-balance">
                {service.name} questions
              </h2>
              <p className="mb-8 max-w-2xl text-sm leading-relaxed text-ink/60">
                {service.tagline}
              </p>
              {service.faq && <ServiceFAQ faq={service.faq} />}
              <div className="mt-6 flex flex-wrap items-center gap-x-4 gap-y-2">
                <Link
                  href={`/services/${service.slug}`}
                  className="small-caps text-ink hover:text-catalyst"
                >
                  {service.name} overview →
                </Link>
                <span className="text-ink/20" aria-hidden="true">
                  ·
                </span>
                <Link
                  href={`/services/${service.slug}#pricing`}
                  className="small-caps text-catalyst hover:text-ink"
                >
                  {service.name} pricing →
                </Link>
              </div>
            </div>
          </BlueprintGrid>
        ))}

        <BlueprintGrid className="bg-bone py-24 lg:py-32">
          <div className="mx-auto max-w-[1600px] px-6 lg:px-10">
            <SectionLabel index="// 06 — Next" title="Still unsure?" />
            <div className="flex flex-col items-start gap-6">
              <p className="max-w-2xl text-lg text-ink/70">
                Compare the three tiers per service on the pricing directory,
                check current offers on promotions, or send an enquiry — Mogen
                replies within one business day.
              </p>
              <div className="flex flex-wrap gap-4">
                <MagneticButton as="a" href="/pricing" variant="catalyst">
                  View pricing →
                </MagneticButton>
                <MagneticButton as="a" href="/promotions" variant="outline">
                  View promotions →
                </MagneticButton>
                <MagneticButton as="a" href="/contact" variant="outline">
                  Contact Mogen →
                </MagneticButton>
              </div>
            </div>
          </div>
        </BlueprintGrid>
      </PageShell>
    </>
  );
}
