"use client";

import { ArrowUpRight, ChevronDown } from "lucide-react";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import type { Promotion } from "@/data/promotions";
import { useConversionCta } from "@/lib/conversion/use-conversion-cta";
import type { EnquiryAttribution } from "@/lib/enquiry/enquiry";
import { useAnchorHref } from "@/lib/use-anchor-href";
import { cn } from "@/lib/utils";
import { Button } from "../ui/button";
import MagneticButton from "./magnet-button";
import ThemeToggle from "./theme-toggle";

const SERVICES_SUB = [
  { label: "Web Development", href: "/services/web-development" },
  { label: "SEO", href: "/services/seo" },
  { label: "Digital Marketing", href: "/services/digital-marketing" },
  { label: "Business Documentation", href: "/services/business-documentation" },
];

const NAV = [
  { label: "Services", href: "/#services", children: SERVICES_SUB },
  { label: "Pricing", href: "/pricing" },
  { label: "Growth Audit", href: "/services/seo#audit" },
  { label: "Promotions", href: "/promotions" },
  // { label: "Work", href: "/#work" },
  { label: "Articles", href: "/articles" },
  { label: "FAQ", href: "/faq" },
  { label: "Contact", href: "/contact" },
];

// const isInternal = (href) => href.startsWith("/") && !href.includes("#");

interface NavProps {
  /**
   * Page service context (service pages pass their slug — always wins).
   * Omitted on the homepage and generic pages.
   */
  serviceSlug?: string;
  /**
   * Fallback service identity for pages without a service context.
   * Defaults to Web Development (the site-wide default).
   */
  defaultServiceSlug?: string;
  /** UTM attribution forwarded into enquiry destinations. */
  attribution?: EnquiryAttribution;
  /**
   * Authoritative featured promotion from `getFeaturedPromotion()`,
   * passed explicitly by the homepage and the promotions routes only.
   * `undefined`/`null` means no promotion applies here.
   */
  featuredPromotion?: Promotion | null;
}

export default function Nav({
  serviceSlug,
  defaultServiceSlug,
  attribution,
  featuredPromotion,
}: Readonly<NavProps> = {}) {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);
  const anchorHref = useAnchorHref();
  const menuButtonRef = useRef<HTMLButtonElement>(null);

  // Header CTA shares its resolution with the Conversion Bar and the
  // footer CTA via useConversionCta — identical inputs on a page resolve
  // to the identical destination and service. Labels come from the
  // resolved service settings, so wording always represents the same
  // journey on all three surfaces.
  const cta = useConversionCta({
    serviceSlug,
    defaultServiceSlug,
    attribution,
    featuredPromotion,
  });

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setOpen(false);
        // Return focus to the trigger: the menu unmounts on close, so
        // focus would otherwise be lost to the document body.
        menuButtonRef.current?.focus();
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);

  // Close the mobile menu when resizing up to desktop so it never
  // lingers open underneath the desktop navigation.
  useEffect(() => {
    const onResize = () => {
      if (window.innerWidth >= 1024) setOpen(false);
    };
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  return (
    <header
      className={cn(
        "fixed inset-x-0 top-0 z-50 transition-all duration-300",
        scrolled
          ? "bg-bone/85 backdrop-blur-md border-b border-ink/10"
          : "bg-transparent",
      )}
    >
      <nav
        className="mx-auto flex max-w-[1600px] items-center justify-between px-6 py-4 lg:px-10"
        aria-label="Primary"
      >
        <Link
          href="/"
          className="flex min-w-0 shrink-0 items-center gap-2"
          aria-label="Mogen home"
        >
          <span className="font-display text-2xl font-black tracking-tight text-ink">
            MOGEN
          </span>
          <span className="h-2 w-2 bg-catalyst" aria-hidden="true" />
        </Link>

        <div className="hidden items-center gap-8 lg:flex">
          {NAV.map((n) =>
            n.children ? (
              <div key={n.label} className="relative group">
                <a
                  href={anchorHref(n.href)}
                  className="small-caps flex items-center gap-1 text-ink/70 transition-colors hover:text-catalyst"
                >
                  {n.label}
                  <ChevronDown className="h-3 w-3" aria-hidden="true" />
                </a>
                <div className="absolute left-0 top-full invisible pt-3 opacity-0 transition-all group-hover:visible group-hover:opacity-100">
                  <div className="min-w-60 border border-ink/10 bg-bone shadow-xl">
                    {n.children.map((c) => (
                      <Link
                        key={c.href}
                        href={c.href}
                        className="block border-b border-ink/5 px-5 py-3 small-caps text-ink/70 transition-colors last:border-0 hover:bg-ink/5 hover:text-catalyst"
                      >
                        {c.label}
                      </Link>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              <Link
                key={n.href}
                href={anchorHref(n.href)}
                className="small-caps text-ink/70 transition-colors hover:text-catalyst"
              >
                {n.label}
              </Link>
            ),
          )}
          {/* <Link
            href="https://store.mogen.co.za"
            target="_blank"
            rel="noopener noreferrer"
            className="small-caps flex items-center gap-1 text-ink/70 transition-colors hover:text-catalyst"
          >
            Store <ArrowUpRight className="h-3 w-3" aria-hidden="true" />
          </Link> */}
        </div>

        <div className="hidden items-center gap-4 lg:flex">
          <ThemeToggle />
          <MagneticButton
            as="a"
            href={cta.href}
            variant="catalyst"
            aria-label={cta.ariaLabel}
          >
            {cta.label}
          </MagneticButton>
        </div>

        <div className="flex shrink-0 items-center gap-2 lg:hidden">
          <ThemeToggle />
          <Button
            ref={menuButtonRef}
            variant="ghost"
            size="icon-lg"
            className="h-11 w-11 text-ink hover:text-catalyst"
            onClick={() => setOpen((v) => !v)}
            aria-label={open ? "Close menu" : "Open menu"}
            aria-expanded={open}
            aria-controls="mobile-menu"
          >
            <span className="space-y-1.5" aria-hidden="true">
              <span
                className={cn(
                  "block h-0.5 w-6 bg-current transition",
                  open && "translate-y-2 rotate-45",
                )}
              />
              <span
                className={cn(
                  "block h-0.5 w-6 bg-current transition",
                  open && "opacity-0",
                )}
              />
              <span
                className={cn(
                  "block h-0.5 w-6 bg-current transition",
                  open && "-translate-y-2 -rotate-45",
                )}
              />
            </span>
          </Button>
        </div>
      </nav>

      {open && (
        <div
          id={"mobile-menu"}
          className="border-t border-ink/10 bg-bone/95 backdrop-blur-md lg:hidden"
        >
          <div className="flex flex-col px-6 py-4">
            {NAV.map((n) =>
              n.children ? (
                <div key={n.label}>
                  <div className="small-caps py-3 text-ink/50">{n.label}</div>
                  <div className="mb-2 ml-4 flex flex-col border-l border-ink/10 pl-3">
                    {n.children.map((c) => (
                      <Link
                        key={c.href}
                        href={c.href}
                        onClick={() => setOpen(false)}
                        className="small-caps py-2 text-ink/70 hover:text-catalyst"
                      >
                        {c.label}
                      </Link>
                    ))}
                  </div>
                </div>
              ) : (
                <Link
                  key={n.href}
                  href={anchorHref(n.href)}
                  onClick={() => setOpen(false)}
                  className="small-caps py-3 text-ink/70 hover:text-catalyst"
                >
                  {n.label}
                </Link>
              ),
            )}
            <a
              href="https://store.mogen.co.za"
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => setOpen(false)}
              className="small-caps flex items-center gap-1 py-3 text-ink/70 hover:text-catalyst"
            >
              Store <ArrowUpRight className="h-3 w-3" aria-hidden="true" />
            </a>
            <MagneticButton
              as="a"
              href={cta.href}
              variant="catalyst"
              className="mt-4 w-full"
              aria-label={cta.ariaLabel}
              onClick={() => setOpen(false)}
            >
              {cta.label}
            </MagneticButton>
          </div>
        </div>
      )}
    </header>
  );
}
