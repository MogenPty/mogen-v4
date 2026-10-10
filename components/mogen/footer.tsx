"use client";

import { ArrowUpRight, Mail, MapPin, Phone } from "lucide-react";
import Link from "next/link";
import { siteConfig } from "@/data/site";
import { useAnchorHref } from "@/lib/use-anchor-href";

interface ColumnLink {
  label: string;
  href: string;
  external?: boolean;
}

interface Column {
  title: string;
  links: ColumnLink[];
}

const COLS: Column[] = [
  {
    title: "Agency",
    links: [
      { label: "Services", href: "/#services" },
      { label: "Growth Audit", href: "/#audit" },
      { label: "Promotions", href: "/promotions" },
      { label: "Our Work", href: "/#work" },
      { label: "Articles", href: "/articles" },
      { label: "Contact", href: "/contact" },
    ],
  },
  {
    title: "Company",
    links: [
      { label: "About", href: "/about" },
      { label: "Our Process", href: "/process" },
      { label: "Success Stories", href: "/success-stories" },
      { label: "Articles", href: "/articles" },
      { label: "Resources", href: "/resources" },
      { label: "Partners", href: "/partners" },
    ],
  },
  {
    title: "Services",
    links: [
      { label: "Web Development", href: "/services/web-development" },
      { label: "SEO", href: "/services/seo" },
      { label: "Digital Marketing", href: "/services/digital-marketing" },
      {
        label: "Business Documentation",
        href: "/services/business-documentation",
      },
    ],
  },
];

/**
 * Locations and Ecosystem share a single footer column, with Locations
 * above Ecosystem — on every breakpoint, including tablet.
 */
const LOCATIONS_COL: Column = {
  title: "Locations",
  links: [
    { label: "All locations", href: "/locations" },
    { label: "Maboloka", href: "/locations/maboloka" },
    { label: "Soshanguve", href: "/locations/soshanguve" },
  ],
};

const ECOSYSTEM_COL: Column = {
  title: "Ecosystem",
  links: [
    {
      label: "Mogen Store",
      href: "https://store.mogen.co.za",
      external: true,
    },
    { label: "Mogen SEO", href: "https://seo.mogen.co.za", external: true },
  ],
};

export default function Footer() {
  const anchorHref = useAnchorHref();

  return (
    <footer className="bg-bone text-foreground">
      <div className="mx-auto max-w-[1600px] px-6 pt-16 pb-32 sm:pb-28 lg:px-10">
        <div className="grid grid-cols-1 gap-12 sm:grid-cols-2 lg:grid-cols-[1.5fr_1fr_1fr_1fr_1fr_1.5fr]">
          <div className="order-1 lg:order-none">
            <Link
              href="/"
              className="flex items-center gap-2"
              aria-label="Mogen home"
            >
              <span className="font-display text-3xl font-black tracking-tight">
                MOGEN
              </span>
              <span className="h-2 w-2 bg-catalyst" aria-hidden="true" />
            </Link>
            <p className="mt-4 max-w-xs text-sm text-forground/60">
              Websites, business documentation and SEO for local businesses in
              Maboloka, Soshanguve & beyond.
            </p>
          </div>

          {/* Link columns: stacked on mobile, 2-up on small screens,
              3-across plus the stacked Locations/Ecosystem column below the
              brand/contact row on tablet, and individual cells of the
              6-column grid on desktop (lg:contents dissolves the wrapper).
              Locations and Ecosystem always share one column, Locations
              above Ecosystem. */}
          <div className="order-2 grid grid-cols-1 gap-12 sm:order-3 sm:col-span-2 sm:grid-cols-2 md:grid-cols-4 md:gap-8 lg:contents">
            {COLS.map((c) => (
              <div key={c.title}>
                <h3 className="small-caps text-foreground/50">{c.title}</h3>
                <ul className="mt-4 space-y-2">
                  {c.links.map((l) => (
                    <li key={l.label}>
                      <Link
                        href={anchorHref(l.href)}
                        target={l.external ? "_blank" : undefined}
                        rel={l.external ? "noopener noreferrer" : undefined}
                        className="flex items-center gap-1 text-sm text-foreground/80 hover:text-catalyst"
                      >
                        {l.label}
                        {l.external && (
                          <ArrowUpRight
                            className="h-3 w-3"
                            aria-hidden="true"
                          />
                        )}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
            <div className="space-y-12">
              {[LOCATIONS_COL, ECOSYSTEM_COL].map((c) => (
                <div key={c.title}>
                  <h3 className="small-caps text-foreground/50">{c.title}</h3>
                  <ul className="mt-4 space-y-2">
                    {c.links.map((l) => (
                      <li key={l.label}>
                        <Link
                          href={anchorHref(l.href)}
                          target={l.external ? "_blank" : undefined}
                          rel={l.external ? "noopener noreferrer" : undefined}
                          className="flex items-center gap-1 text-sm text-foreground/80 hover:text-catalyst"
                        >
                          {l.label}
                          {l.external && (
                            <ArrowUpRight
                              className="h-3 w-3"
                              aria-hidden="true"
                            />
                          )}
                        </Link>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </div>

          <div className="order-3 sm:order-2 sm:justify-self-end lg:order-none lg:justify-self-auto">
            <h3 className="small-caps text-foreground/50">Contact</h3>
            <ul className="mt-4 space-y-3 text-sm text-foreground/80">
              <li className="flex min-w-0 items-center gap-2">
                <Mail
                  className="h-4 w-4 shrink-0 text-catalyst"
                  aria-hidden="true"
                />
                <a
                  href={`mailto:${siteConfig.email}`}
                  className="min-w-0 break-all hover:text-catalyst"
                >
                  {siteConfig.email}
                </a>
              </li>
              <li className="flex items-center gap-2">
                <Phone className="h-4 w-4 text-catalyst" aria-hidden="true" />
                <a
                  href={`tel:${siteConfig.telephone}`}
                  className="hover:text-catalyst"
                >
                  {siteConfig.telephoneDisplay}
                </a>
              </li>
              <li className="flex items-center gap-2">
                <MapPin className="h-4 w-4 text-catalyst" aria-hidden="true" />
                <span>Serving North West & beyond, ZA</span>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-14 flex flex-col items-start justify-between gap-4 border-t border-bone/10 pt-6 sm:flex-row sm:items-center">
          <p className="small-caps text-foreground/40">
            © {new Date().getFullYear()} Mogen. All rights reserved.
          </p>
          <div className="flex gap-6">
            <a
              href="/privacy-policy"
              className="small-caps text-foreground/60 hover:text-catalyst"
            >
              Privacy
            </a>
            <a
              href="/terms-of-service"
              className="small-caps text-foreground/60 hover:text-catalyst"
            >
              Terms
            </a>
            <Link
              href={anchorHref("/#audit")}
              className="small-caps text-catalyst"
            >
              Get Audit →
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
