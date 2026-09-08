"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

/**
 * ConversionBar — floating quick-action bar that tracks the visitor's
 * "Conversion Readiness" as they scroll deeper into the funnel.
 */
export default function ConversionBar() {
  const [ready, setReady] = useState(0);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const onScroll = () => {
      const max = document.body.scrollHeight - window.innerHeight;
      const pct = max > 0 ? Math.min(1, window.scrollY / max) : 0;
      setReady(Math.round(pct * 100));
      setVisible(window.scrollY > 600);
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <section
      className={cn(
        "fixed inset-x-0 bottom-0 z-40 transition-transform duration-300",
        visible ? "translate-y-0" : "translate-y-full",
      )}
      aria-label="Conversion readiness"
    >
      <div className="mx-auto max-w-[1600px] px-4 pb-4">
        <div className="flex items-center justify-between gap-4 border border-ink/15 bg-bone/90 px-4 py-3 backdrop-blur-md sm:px-6">
          <div className="flex items-center gap-3">
            <span className="small-caps text-muted-foreground">
              Conversion Readiness
            </span>
            <div
              className="hidden h-2 w-32 bg-ink/10 sm:block"
              aria-hidden="true"
            >
              <div
                className="h-full bg-catalyst transition-all duration-300"
                style={{ width: `${ready}%` }}
              />
            </div>
            <span className="font-display text-sm font-black text-ink">
              {ready}%
            </span>
          </div>
          <Link
            href="/#audit"
            className="small-caps bg-catalyst px-5 py-2 text-white transition-colors hover:bg-ink"
            aria-label="Get your free growth audit now"
          >
            Get Free Audit →
          </Link>
        </div>
      </div>
    </section>
  );
}
