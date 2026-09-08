"use client";

import { ArrowUpRight, Mail, MapPin, Phone } from "lucide-react";
import Link from "next/link";

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
      { label: "Our Work", href: "/#work" },
      { label: "Pricing", href: "/#pricing" },
      { label: "Contact", href: "/contact" },
    ],
  },
  {
    title: "Ecosystem",
    links: [
      {
        label: "Mogen Store",
        href: "https://store.mogen.co.za",
        external: true,
      },
      { label: "Mogen SEO", href: "https://seo.mogen.co.za", external: true },
    ],
  },
  {
    title: "Company",
    links: [
      { label: "About", href: "/about" },
      { label: "Our Process", href: "/process" },
      { label: "Success Stories", href: "/success-stories" },
      { label: "Blog", href: "/blog" },
      { label: "Resources", href: "/resources" },
      { label: "Partners", href: "/partners" },
    ],
  },
  {
    title: "Services",
    links: [
      { label: "Web Development", href: "/services/web-development" },
      { label: "Brand Identity", href: "/services/brand-identity" },
      { label: "SEO Services", href: "/services/seo-services" },
      { label: "Digital Marketing", href: "/services/digital-marketing" },
    ],
  },
];

export default function Footer() {
  return (
    <footer className="bg-ink text-bone">
      <div className="mx-auto max-w-[1600px] px-6 py-16 lg:px-10">
        <div className="grid grid-cols-1 gap-12 lg:grid-cols-[1.5fr_1fr_1fr_1fr_1fr_1.5fr]">
          <div>
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
            <p className="mt-4 max-w-xs text-sm text-bone/60">
              Stunning websites, killer brands and rank-winning SEO for local
              businesses in Pretoria, Maboloka, Soshanguve & across Gauteng.
            </p>
          </div>

          {COLS.map((c) => (
            <div key={c.title}>
              <h3 className="small-caps text-bone/50">{c.title}</h3>
              <ul className="mt-4 space-y-2">
                {c.links.map((l) => (
                  <li key={l.label}>
                    <Link
                      href={l.href}
                      target={l.external ? "_blank" : undefined}
                      rel={l.external ? "noopener noreferrer" : undefined}
                      className="flex items-center gap-1 text-sm text-bone/80 hover:text-catalyst"
                    >
                      {l.label}
                      {l.external && (
                        <ArrowUpRight className="h-3 w-3" aria-hidden="true" />
                      )}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}

          <div>
            <h3 className="small-caps text-bone/50">Contact</h3>
            <ul className="mt-4 space-y-3 text-sm text-bone/80">
              <li className="flex items-center gap-2">
                <Mail className="h-4 w-4 text-catalyst" aria-hidden="true" />
                <a
                  href="mailto:hello@mogen.co.za"
                  className="hover:text-catalyst"
                >
                  hello@mogen.co.za
                </a>
              </li>
              <li className="flex items-center gap-2">
                <Phone className="h-4 w-4 text-catalyst" aria-hidden="true" />
                <a href="tel:+27000000000" className="hover:text-catalyst">
                  Pretoria, Gauteng
                </a>
              </li>
              <li className="flex items-center gap-2">
                <MapPin className="h-4 w-4 text-catalyst" aria-hidden="true" />
                <span>Serving Gauteng & beyond, ZA</span>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-14 flex flex-col items-start justify-between gap-4 border-t border-bone/10 pt-6 sm:flex-row sm:items-center">
          <p className="small-caps text-bone/40">
            © {new Date().getFullYear()} Mogen. All rights reserved.
          </p>
          <div className="flex gap-6">
            <a
              href="/privacy-policy"
              className="small-caps text-bone/60 hover:text-catalyst"
            >
              Privacy
            </a>
            <a
              href="/terms-of-service"
              className="small-caps text-bone/60 hover:text-catalyst"
            >
              Terms
            </a>
            <Link href="/#audit" className="small-caps text-catalyst">
              Get Audit →
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
