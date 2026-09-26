import type { Metadata } from "next";
import {
  Check,
  ClipboardList,
  Compass,
  Hammer,
  SearchCheck,
} from "lucide-react";
import Link from "next/link";
import BlueprintGrid, { SectionLabel } from "@/components/mogen/blueprint-grid";
import FinalCTA from "@/components/mogen/final-cta";
import LocationsPreview from "@/components/mogen/locations-preview";
import PageShell from "@/components/mogen/page-shell";
import Services from "@/components/mogen/services";
import WhatMogenDoes from "@/components/mogen/what-mogen-does";
import WhyMogen from "@/components/mogen/why-mogen";
import { siteConfig } from "@/data/site";
import { formatNumber } from "@/lib/utils";

const PAGE_URL = `${siteConfig.url}/about`;

export const metadata: Metadata = {
  // Rendered title becomes "About Mogen | Mogen" via the layout template.
  // The fuller "About Mogen | Digital Services for South African Businesses"
  // form is used for Open Graph / Twitter titles below.
  title: "About Mogen",
  description:
    "Mogen Pty Ltd (Motsoane Global Enterprise) is a South African digital services business based in Maboloka, North West — web development, SEO, digital marketing and business documentation for businesses across South Africa.",
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
    title: "About Mogen | Digital Services for South African Businesses",
    description:
      "Who Mogen is, what Mogen does, how Mogen works, and where Mogen operates — practical digital services based in Maboloka, serving South African businesses.",
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
    title: "About Mogen | Digital Services for South African Businesses",
    description:
      "Who Mogen is, what Mogen does, how Mogen works, and where Mogen operates — practical digital services based in Maboloka, serving South African businesses.",
    images: [siteConfig.ogImage],
  },
};

const HOW_STEPS = [
  {
    icon: SearchCheck,
    title: "Understand",
    desc: "Understand the business, its audience, its current digital presence, and what it actually needs — before any technology is selected.",
  },
  {
    icon: ClipboardList,
    title: "Plan",
    desc: "Define the appropriate solution: structure, content, technical requirements, and priorities — so scope stays clear and costs stay predictable.",
  },
  {
    icon: Hammer,
    title: "Build",
    desc: "Implement the agreed solution using appropriate modern web and digital technologies — fast, secure, and built to last.",
  },
  {
    icon: Compass,
    title: "Improve",
    desc: "Review performance, search visibility, usability, content, and conversion opportunities where applicable — and act on what the evidence shows.",
  },
];

const TECHNICAL_AREAS = [
  "Modern web development",
  "Front-end development",
  "Back-end development",
  "Databases",
  "Web applications",
  "SEO implementation",
  "Performance optimisation",
  "Technical problem solving",
  "Modernisation of existing systems",
  "Business Documentation",
  "APIs and integrations",
  "Automation",
];

function AboutJsonLd() {
  const organizationId = `${siteConfig.url}/#organization`;
  const websiteId = `${siteConfig.url}/#website`;
  // Same @ids and values as the homepage graph — a consistent reference,
  // not a second competing identity. No Person entities, no invented data.
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
        address: {
          "@type": "PostalAddress",
          addressLocality: siteConfig.address.addressLocality,
          addressRegion: siteConfig.address.addressRegion,
          addressCountry: siteConfig.address.addressCountry,
        },
        ...(siteConfig.sameAs.length > 0 ? { sameAs: siteConfig.sameAs } : {}),
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
        "@type": "AboutPage",
        "@id": `${PAGE_URL}#webpage`,
        url: PAGE_URL,
        name: "About Mogen | Digital Services for South African Businesses",
        description:
          "Who Mogen is, what Mogen does, how Mogen works, and where Mogen operates.",
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

export default function About() {
  return (
    <PageShell
      index="// 01 — About Mogen"
      label="About Mogen"
      title={
        <>
          MO<span className="text-catalyst">GEN.</span>
        </>
      }
      intro="Mogen is a South African digital services business based in Maboloka, North West. Mogen helps businesses build and improve the digital foundations they rely on to be found, understood, and contacted online — across Pretoria, Soshanguve, Gauteng, and elsewhere in South Africa."
    >
      <AboutJsonLd />

      {/* 02 — Who Mogen is (reused homepage section, About numbering) */}
      <WhatMogenDoes numbering={2} />

      {/* 03 — What Mogen does (reused service grid, About numbering) */}
      <Services numbering={3} auditHref="/#audit" />
      <div className="bg-bone pb-4">
        <div className="mx-auto max-w-[1600px] px-6 lg:px-10">
          <Link
            href="/services"
            className="small-caps text-ink hover:text-catalyst"
          >
            View all services →
          </Link>
        </div>
      </div>

      {/* 04 — How Mogen works */}
      <BlueprintGrid
        id="how-mogen-works"
        className="bg-secondary py-24 lg:py-32"
      >
        <div className="mx-auto max-w-[1600px] px-6 lg:px-10">
          <SectionLabel
            index={`// ${formatNumber(4)} — How Mogen Works`}
            title="Deliberate, Not Rushed"
          />
          <div className="mb-14 max-w-2xl">
            <h2 className="font-display text-4xl font-black leading-[1.05] text-ink lg:text-6xl text-balance">
              Understand first,
              <br />
              <span className="text-catalyst">then build.</span>
            </h2>
            <p className="mt-6 text-lg text-ink/70">
              Mogen&apos;s working approach is deliberate rather than
              &ldquo;build first, figure it out later.&rdquo; The business comes
              before the technology — every time.
            </p>
          </div>
          <div className="grid grid-cols-1 gap-px bg-ink/10 md:grid-cols-2 lg:grid-cols-4">
            {HOW_STEPS.map((s) => {
              const Icon = s.icon;
              return (
                <div key={s.title} className="bg-bone p-8">
                  <Icon
                    className="h-8 w-8 text-catalyst"
                    strokeWidth={1.5}
                    aria-hidden="true"
                  />
                  <h3 className="mt-6 font-display text-xl font-black text-ink">
                    {s.title}
                  </h3>
                  <p className="mt-3 text-sm leading-relaxed text-ink/70">
                    {s.desc}
                  </p>
                </div>
              );
            })}
          </div>
          <p className="mt-10 text-sm text-ink/60">
            This is a working approach, not a rigid methodology.{" "}
            <Link
              href="/process"
              className="small-caps text-ink hover:text-catalyst"
            >
              See the process in more detail →
            </Link>
          </p>
        </div>
      </BlueprintGrid>

      {/* 05 — Technical experience */}
      <BlueprintGrid
        id="technical-experience"
        className="bg-bone py-24 lg:py-32"
      >
        <div className="mx-auto max-w-[1600px] px-6 lg:px-10">
          <SectionLabel
            index={`// ${formatNumber(5)} — Technical Experience`}
            title="Technical Depth"
          />
          <div className="grid grid-cols-1 gap-10 lg:grid-cols-[1.1fr_1.9fr] lg:gap-16">
            <div>
              <h2 className="font-display text-4xl font-black leading-[1.05] text-ink lg:text-5xl text-balance">
                More than
                <br />
                <span className="text-catalyst">website assembly.</span>
              </h2>
            </div>
            <div className="space-y-5 text-lg leading-relaxed text-ink/70">
              <p>
                Mogen&apos;s technical background extends beyond putting pages
                together. Websites are designed around the needs of the business
                — structured for clarity and discovery, engineered for speed and
                security, and connected to the systems around them: search,
                analytics, forms, messaging, and the documents a business runs
                on.
              </p>
              <p>
                That includes modernising existing systems where replacement
                would waste what already works, and automating repetitive work
                where it genuinely saves time. Technology is chosen to solve the
                actual business problem — not for its own sake.
              </p>
            </div>
          </div>
          <div className="mt-12 grid grid-cols-1 gap-px bg-ink/10 sm:grid-cols-2 lg:grid-cols-3">
            {TECHNICAL_AREAS.map((area) => (
              <div key={area} className="flex items-center gap-3 bg-bone p-6">
                <Check
                  className="h-5 w-5 shrink-0 text-catalyst"
                  aria-hidden="true"
                />
                <span className="text-ink/80">{area}</span>
              </div>
            ))}
          </div>
          <p className="mt-10 text-sm text-ink/60">
            No certifications, partnerships, or accreditations are claimed here
            — only the work itself. For practical notes on websites, local SEO,
            and digital marketing, see the{" "}
            <Link
              href="/blog"
              className="small-caps text-ink hover:text-catalyst"
            >
              blog →
            </Link>
          </p>
        </div>
      </BlueprintGrid>

      {/* 06 — Mogen's approach (reused homepage section, About numbering) */}
      <WhyMogen numbering={6} />

      {/* 07 — Where Mogen works (reused locations section, About numbering) */}
      <LocationsPreview numbering={7} />

      {/* 08 — Next step */}
      <FinalCTA numbering={8} auditHref="/#audit" />
    </PageShell>
  );
}
