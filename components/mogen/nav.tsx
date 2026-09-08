"use client";

import { ArrowUpRight, ChevronDown } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import { Button } from "../ui/button";
import MagneticButton from "./magnet-button";

const SERVICES_SUB = [
  { label: "Web Development", href: "/services/web-development" },
  { label: "Mobile Development", href: "/services/mobile-development" },
  { label: "Brand Identity", href: "/services/brand-identity" },
  { label: "Digital Marketing", href: "/services/digital-marketing" },
  { label: "SEO Services", href: "/services/seo-services" },
];

const NAV = [
  { label: "Services", href: "/#services", children: SERVICES_SUB },
  { label: "Growth Audit", href: "/#audit" },
  { label: "Work", href: "/#work" },
  { label: "Pricing", href: "/#pricing" },
  { label: "Contact", href: "/contact" },
];

// const isInternal = (href) => href.startsWith("/") && !href.includes("#");

export default function Nav() {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
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
          className="flex items-center gap-2"
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
                  href={n.href}
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
                href={n.href}
                className="small-caps text-ink/70 transition-colors hover:text-catalyst"
              >
                {n.label}
              </Link>
            ),
          )}
          <Link
            href="https://store.mogen.co.za"
            target="_blank"
            rel="noopener noreferrer"
            className="small-caps flex items-center gap-1 text-ink/70 transition-colors hover:text-catalyst"
          >
            Store <ArrowUpRight className="h-3 w-3" aria-hidden="true" />
          </Link>
        </div>

        <div className="hidden lg:block">
          <MagneticButton
            as="a"
            href="/#audit"
            variant="catalyst"
            aria-label="Get a free growth audit"
          >
            Free Audit
          </MagneticButton>
        </div>

        <Button
          className="lg:hidden p-2"
          onClick={() => setOpen((v) => !v)}
          aria-label="Toggle menu"
          aria-expanded={open}
        >
          <div className="space-y-1.5">
            <span
              className={cn(
                "block h-0.5 w-6 bg-ink transition",
                open && "translate-y-2 rotate-45",
              )}
            />
            <span
              className={cn(
                "block h-0.5 w-6 bg-ink transition",
                open && "opacity-0",
              )}
            />
            <span
              className={cn(
                "block h-0.5 w-6 bg-ink transition",
                open && "-translate-y-2 -rotate-45",
              )}
            />
          </div>
        </Button>
      </nav>

      {open && (
        <div className="lg:hidden border-t border-ink/10 bg-bone/95 backdrop-blur-md">
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
                  href={n.href}
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
              href="/#audit"
              variant="catalyst"
              className="mt-4 w-full"
              onClick={() => setOpen(false)}
            >
              Free Audit
            </MagneticButton>
          </div>
        </div>
      )}
    </header>
  );
}
