"use client";

import Link from "next/link";
import { useState } from "react";
import type { PublicWebPriceChoice } from "./web-price-options";

const modes = {
  managed_monthly: "Managed Monthly",
  managed_annual: "Managed Annually",
  self_hosted: "Self-Hosted",
  once_off: "Once-Off",
};
const order = ["managed_monthly", "managed_annual", "self_hosted", "once_off"];
const zar = (cents: number) => new Intl.NumberFormat("en-ZA", {
  style: "currency", currency: "ZAR", maximumFractionDigits: 0,
}).format(cents / 100);

export default function LocationOfferPayment({
  packageId, packageName, options, featured = false,
}: Readonly<{
  packageId: string;
  packageName: string;
  options: PublicWebPriceChoice[];
  featured?: boolean;
}>) {
  const sorted = [...options].sort((a, b) => order.indexOf(a.billingMode) - order.indexOf(b.billingMode));
  const [id, setId] = useState(sorted[0]?.id ?? "");
  const selected = sorted.find(o => o.id === id) ?? sorted[0];
  const href = `/contact?service=web-development&package=${encodeURIComponent(packageId)}${selected ? `&priceOption=${encodeURIComponent(selected.id)}` : ""}`;
  const button = featured
    ? "bg-white !text-[#171717] hover:bg-[#f3f3f3] hover:!text-[#171717]"
    : "bg-catalyst !text-white hover:bg-catalyst-hover hover:!text-white";
  return (
    <div className="mt-5 flex flex-col gap-3">
      {selected ? (
        <>
          <label className={`text-sm font-semibold ${featured ? "text-white" : "text-ink"}`} htmlFor={`location-billing-${packageId}`}>
            How would you like to pay?
          </label>
          <select
            id={`location-billing-${packageId}`}
            value={selected.id}
            onChange={event => setId(event.target.value)}
            className="w-full rounded border border-ink/25 bg-white px-3 py-3 text-sm text-[#171717]"
          >
            {sorted.map(option => <option key={option.id} value={option.id}>{modes[option.billingMode]}</option>)}
          </select>
          <div aria-live="polite">
            <p className="font-display text-2xl font-black">
              {zar(selected.amountCents)}
              {selected.billingMode === "managed_monthly" ? "/month" :
                selected.billingMode === "managed_annual" ? "/year" : " once-off"}
            </p>
            {selected.setupFeeCents !== null && selected.setupFeeCents > 0 &&
              <p className={`mt-1 text-sm ${featured ? "text-white/90" : "text-ink/70"}`}>Plus {zar(selected.setupFeeCents)} once-off setup</p>}
            {selected.minimumMonths !== null && selected.minimumMonths > 0 &&
              <p className={`mt-1 text-sm ${featured ? "text-white/90" : "text-ink/70"}`}>Initial term: {selected.minimumMonths} months</p>}
          </div>
        </>
      ) : (
        <p className={`font-semibold ${featured ? "text-white" : "text-ink"}`}>Custom quotation</p>
      )}
      <Link href={href}
        className={`mt-3 inline-flex justify-center rounded px-4 py-3 text-center font-semibold transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 ${button}`}>
        Enquire about {packageName}
      </Link>
    </div>
  );
}
