"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { recommendCataloguePackage, type CatalogueNeed } from "@/lib/catalogue/recommendation";
import type { CatalogueWebPackage } from "@/lib/catalogue/location-offer";
import type { PublicWebPriceChoice } from "@/components/mogen/web-price-options";
import { withAttribution, type EnquiryAttribution } from "@/lib/enquiry/enquiry";

const choices: Array<{ value: CatalogueNeed; label: string }> = [
  { value: "first", label: "I need my first website" },
  { value: "brochure", label: "I need several business pages" },
  { value: "growth", label: "I need a site I can grow and update" },
  { value: "marketing", label: "I need conversion-focused landing pages" },
  { value: "booking", label: "I need booking, commerce or workflows" },
  { value: "custom", label: "I need a custom business platform" },
];

export default function WebCatalogueFinder({ packages, prices = [], attribution }: Readonly<{ packages: CatalogueWebPackage[]; prices?: PublicWebPriceChoice[]; attribution?: EnquiryAttribution }>) {
  const [need, setNeed] = useState<CatalogueNeed>("first");
  const recommendation = useMemo(() => recommendCataloguePackage(packages, need), [packages, need]);
  const monthly = recommendation && prices.find(p => p.packageId === recommendation.id && p.billingMode === "managed_monthly");
  const onceOff = recommendation?.id === "seed" ? prices.find(p => p.packageId === "seed" && p.billingMode === "once_off") : undefined;
  const selectedPrice = monthly ?? onceOff;
  const href = withAttribution(recommendation
    ? `/contact?service=web-development&package=${encodeURIComponent(recommendation.id)}${selectedPrice ? `&priceOption=${encodeURIComponent(selectedPrice.id)}` : ""}`
    : "/contact?service=web-development", attribution);
  const zar = (cents: number) => new Intl.NumberFormat("en-ZA", { style: "currency", currency: "ZAR", maximumFractionDigits: 0 }).format(cents / 100);
  return (
    <section id="assessment" className="bg-ink px-6 py-20 text-bone lg:px-10" aria-labelledby="website-assessment-heading">
      <div className="mx-auto max-w-4xl">
        <p className="small-caps text-catalyst">Website assessment</p>
        <h2 id="website-assessment-heading" className="mt-4 font-display text-4xl font-black lg:text-5xl">
          Which website suits your business?
        </h2>
        <p className="mt-4 text-bone/70">Choose your main requirement. This is an initial recommendation, not a binding quote.</p>
        <label className="mt-7 block font-semibold" htmlFor="catalogue-need">What do you need?</label>
        <select id="catalogue-need" value={need} onChange={e => setNeed(e.target.value as CatalogueNeed)}
          className="mt-2 w-full rounded bg-white px-4 py-3 text-black">
          {choices.map(choice => <option key={choice.value} value={choice.value}>{choice.label}</option>)}
        </select>
        {recommendation ? (
          <div aria-live="polite" className="mt-7 rounded-lg border border-bone/30 p-6">
            <p className="small-caps text-catalyst">Suggested starting point</p>
            <h3 className="mt-2 font-display text-3xl font-black">{recommendation.name}</h3>
            <p className="mt-3 text-bone/80">{recommendation.summary}</p>
            {selectedPrice ? (
              <div className="mt-3">
                <p className="font-display text-2xl font-black">{zar(selectedPrice.amountCents)}{monthly ? "/month" : " once-off"}</p>
                {monthly && monthly.setupFeeCents !== null && monthly.setupFeeCents > 0 &&
                  <p className="mt-1 text-sm text-bone/80">Plus {zar(monthly.setupFeeCents)} once-off setup</p>}
                <p className="mt-1 text-xs text-bone/70">Other payment choices available on the Web Development pricing page.</p>
              </div>
            ) : <p className="mt-3 font-semibold">{recommendation.pricingLabel}</p>}
            <Link className="mt-6 inline-block rounded bg-catalyst px-5 py-3 font-semibold text-white" href={href}>
              Discuss {recommendation.name} with Mogen
            </Link>
          </div>
        ) : (
          <div aria-live="polite" className="mt-7">
            <p>No published package matches that requirement yet. We can still prepare a tailored quotation.</p>
            <Link className="mt-4 inline-block rounded bg-catalyst px-5 py-3 font-semibold text-white" href={href}>Request a consultation</Link>
          </div>
        )}
      </div>
    </section>
  );
}
