"use client";

import { Check } from "lucide-react";
import BlueprintGrid, { SectionLabel } from "./blueprint-grid";
import MagneticButton from "./magnet-button";

const TIERS = [
  {
    name: "Ignite",
    price: "R4,900",
    cadence: "once-off",
    blurb:
      "A stunning, fast, responsive website for a local business ready to be found.",
    features: [
      "3–5 page custom website",
      "Mobile-first responsive build",
      "Basic on-page SEO",
      "Google Business Profile setup",
      "WhatsApp / lead capture",
      "2-week delivery",
    ],
    cta: "Start Ignite",
    variant: "outline",
  },
  {
    name: "Grow",
    price: "R8,500",
    cadence: "/ month",
    blurb:
      "Website + ongoing SEO and content that compounds your local rankings.",
    features: [
      "Everything in Ignite",
      "Local SEO (Pretoria grid)",
      "Monthly content & blog",
      "Core Web Vitals remediation",
      "GBP optimisation & reviews",
      "Monthly growth report",
    ],
    cta: "Scale to Grow",
    variant: "catalyst",
    featured: true,
  },
  {
    name: "Dominate",
    price: "R16,500",
    cadence: "/ month",
    blurb:
      "Full-stack growth — web, brand, SEO and digital marketing working as one.",
    features: [
      "Everything in Grow",
      "Full 37-step SEO framework",
      "Brand identity refresh",
      "Social & digital marketing",
      "Competitor backlink infiltration",
      "Bi-weekly strategy review",
    ],
    cta: "Dominate Gauteng",
    variant: "solid",
  },
];

export default function Pricing() {
  return (
    <BlueprintGrid id={"pricing"} className="bg-bone py-24 lg:py-32">
      <div className="mx-auto max-w-[1600px] px-6 lg:px-10">
        <SectionLabel index="// 06 — Investment" title="Packages" />

        <div className="mb-14 max-w-2xl">
          <h2 className="font-display text-4xl font-black leading-[1.05] text-ink lg:text-6xl text-balance">
            Pricing engineered
            <br />
            <span className="text-catalyst">to scale.</span>
          </h2>
          <p className="mt-6 text-lg text-ink/70">
            Transparent, local-friendly rates. No lock-in surprises — pick the
            engine that matches your growth stage.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-px bg-ink/10 lg:grid-cols-3">
          {TIERS.map((t) => (
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
              <p
                className={
                  "mt-2 text-sm " +
                  (t.featured ? "text-bone/70" : "text-ink/60")
                }
              >
                {t.blurb}
              </p>
              <div className="mt-6 flex items-end gap-2">
                <span className="font-display text-5xl font-black">
                  {t.price}
                </span>
                <span
                  className={
                    "mb-2 small-caps " +
                    (t.featured ? "text-bone/60" : "text-muted-foreground")
                  }
                >
                  {t.cadence}
                </span>
              </div>
              <ul className="mt-8 flex-1 space-y-3">
                {t.features.map((f) => (
                  <li key={f} className="flex items-start gap-3 text-sm">
                    <Check
                      className="mt-0.5 h-4 w-4 shrink-0 text-catalyst"
                      aria-hidden="true"
                    />
                    <span
                      className={t.featured ? "text-bone/90" : "text-ink/80"}
                    >
                      {f}
                    </span>
                  </li>
                ))}
              </ul>
              <MagneticButton
                as="a"
                href="#audit"
                variant={t.variant}
                className="mt-8 w-full"
              >
                {t.cta}
              </MagneticButton>
            </article>
          ))}
        </div>
      </div>
    </BlueprintGrid>
  );
}
