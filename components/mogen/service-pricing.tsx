"use client";

import { Check } from "lucide-react";
import MagneticButton from "./magnet-button";

export default function ServicePricing({ pricing, serviceSlug }) {
  return (
    <div className="grid grid-cols-1 gap-px bg-ink/10 lg:grid-cols-3">
      {pricing.map((t) => (
        <article
          key={t.name}
          className={
            "relative flex flex-col bg-bone p-8 " +
            (t.featured ? "bg-ink text-bone" : "")
          }
        >
          {t.featured && (
            <span className="absolute right-6 top-6 small-caps bg-catalyst px-3 py-1 text-white">
              Recommended
            </span>
          )}
          <h3 className="font-display text-2xl font-black">{t.name}</h3>
          <div className="mt-6 flex items-end gap-2">
            <span className="font-display text-5xl font-black">{t.price}</span>
            {t.cadence && (
              <span
                className={
                  "mb-2 small-caps " +
                  (t.featured ? "text-bone/60" : "text-muted-foreground")
                }
              >
                {t.cadence}
              </span>
            )}
          </div>
          <ul className="mt-8 flex-1 space-y-3">
            {t.features.map((f) => (
              <li key={f} className="flex items-start gap-3 text-sm">
                <Check
                  className="mt-0.5 h-4 w-4 shrink-0 text-catalyst"
                  aria-hidden="true"
                />
                <span className={t.featured ? "text-bone/90" : "text-ink/80"}>
                  {f}
                </span>
              </li>
            ))}
          </ul>
          <MagneticButton
            as="a"
            href="#quote"
            variant={t.featured ? "catalyst" : "outline"}
            className="mt-8 w-full"
          >
            Get a Quote
          </MagneticButton>
        </article>
      ))}
    </div>
  );
}
