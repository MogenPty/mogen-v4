"use client";

import Link from "next/link";
import { ArrowRight, Code2, FileText, Megaphone, Search } from "lucide-react";
import BlueprintGrid, { SectionLabel } from "./blueprint-grid";
import MagneticButton from "./magnet-button";

interface ServiceTrioItem {
  slug: string;
  name: string;
  icon: React.ComponentType<{ className?: string; strokeWidth?: number; "aria-hidden"?: boolean }>;
  promise: string;
  href: string;
}

const SERVICES: ServiceTrioItem[] = [
  {
    slug: "web-development",
    name: "Web Development",
    icon: Code2,
    promise: "Custom websites engineered to convert visitors into customers.",
    href: "/services/web-development",
  },
  {
    slug: "seo",
    name: "SEO",
    icon: Search,
    promise: "Local SEO that gets you found on Google — and brings real enquiries.",
    href: "/services/seo",
  },
  {
    slug: "digital-marketing",
    name: "Digital Marketing",
    icon: Megaphone,
    promise: "Content and campaigns that put your business in front of the right people.",
    href: "/services/digital-marketing",
  },
  {
    slug: "business-documentation",
    name: "Business Documentation",
    icon: FileText,
    promise: "Policies, procedures and templates that help your team work consistently.",
    href: "/services/business-documentation",
  },
];

interface ServicesTrioProps {
  featuredServiceSlug: string;
}

export default function ServicesTrio({ featuredServiceSlug }: Readonly<ServicesTrioProps>) {
  const otherServices = SERVICES.filter(({ slug }) => slug !== featuredServiceSlug);

  return (
    <BlueprintGrid id="services" className="bg-secondary py-20 lg:py-28">
      <div className="mx-auto max-w-[1600px] px-6 lg:px-10">
        <SectionLabel index="// 4 — Services" title="Other Services" />
        <div className="mt-8 grid grid-cols-1 gap-6 md:grid-cols-3">
          {otherServices.map((svc) => (
            <article
              key={svc.slug}
              className="bg-card border border-border rounded-xl p-6 lg:p-8 transition-all hover:border-catalyst"
            >
              <svc.icon className="h-8 w-8 text-catalyst" strokeWidth={1.5} aria-hidden={true} />
              <h3 className="mt-4 font-display text-xl font-black text-ink">{svc.name}</h3>
              <p className="mt-3 text-sm leading-relaxed text-ink/70">{svc.promise}</p>
              <Link
                href={svc.href}
                className="mt-5 inline-flex items-center gap-1 small-caps text-catalyst hover:text-ink transition-colors"
              >
                View service <ArrowRight className="h-4 w-4" />
              </Link>
            </article>
          ))}
        </div>

        <div className="mt-10">
          <MagneticButton
            as="a"
            href="/services"
            variant="outline"
          >
            All Services <ArrowRight className="h-4 w-4" />
          </MagneticButton>
        </div>
      </div>
    </BlueprintGrid>
  );
}
