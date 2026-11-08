"use client";

import Link from "next/link";
import { useState } from "react";
import type { BillingMode } from "@/lib/catalogue/commercial";

export interface PublicWebPriceChoice {
  id: string;
  packageId: string;
  billingMode: BillingMode;
  amountCents: number;
  setupFeeCents: number | null;
  minimumMonths: number | null;
  depositPercent: number | null;
  initialHostingMonths: number | null;
  handoverPolicy: string;
}

const labels: Record<BillingMode, string> = {
  managed_monthly: "Managed Monthly",
  managed_annual: "Managed Annually",
  once_off: "Once-Off",
  self_hosted: "Self-Hosted",
};
const descriptions: Record<BillingMode, string> = {
  managed_monthly: "Mogen hosts, maintains and supports your website on an ongoing subscription.",
  managed_annual: "The same managed hosting, maintenance and support, billed annually at the same recurring rate.",
  once_off: "One-time setup. Any later fixes are quoted separately.",
  self_hosted: "Mogen hands over the source code and project files. You handle hosting and maintenance.",
};

const zar = (amount: number) =>
  new Intl.NumberFormat("en-ZA", { style: "currency", currency: "ZAR" }).format(amount / 100);

export default function WebPriceOptions({
  packageId,
  options,
}: Readonly<{ packageId: string; options: PublicWebPriceChoice[] }>) {
  const [selectedId, setSelectedId] = useState(options[0]?.id ?? "");
  const selected = options.find(option => option.id === selectedId) ?? options[0];
  if (!selected) {
    return (
      <Link href={`/contact?service=web-development&package=${encodeURIComponent(packageId)}`}
        className="mt-7 block rounded bg-catalyst px-5 py-3 text-center font-semibold !text-white hover:bg-catalyst-hover hover:!text-white">
        Request a quote
      </Link>
    );
  }
  const href = `/contact?service=web-development&package=${encodeURIComponent(packageId)}&priceOption=${encodeURIComponent(selected.id)}`;
  return (
    <div className="mt-5 flex flex-1 flex-col border-t border-ink/15 pt-5">
      <label htmlFor={`billing-${packageId}`} className="small-caps text-ink/70">
        How would you like to pay?
      </label>
      <select id={`billing-${packageId}`} value={selected.id}
        onChange={e => setSelectedId(e.target.value)}
        className="mt-2 w-full rounded border border-ink/30 bg-white px-3 py-2 text-sm text-[#171717]">
        {options.map(option =>
          <option key={option.id} value={option.id}>{labels[option.billingMode]}</option>
        )}
      </select>
      <div aria-live="polite" className="mt-3 space-y-2">
        <p className="font-display text-2xl font-black text-ink">
          {zar(selected.amountCents)}{selected.billingMode === "managed_monthly" ? "/month" : selected.billingMode === "managed_annual" ? "/year" : " once-off"}
        </p>
        {selected.setupFeeCents !== null && selected.setupFeeCents > 0 &&
          <p className="text-sm text-ink/70">Setup: {zar(selected.setupFeeCents)}</p>}
        {selected.minimumMonths !== null && selected.minimumMonths > 0 &&
          <p className="text-sm text-ink/70">Minimum term: {selected.minimumMonths} months</p>}
        {selected.depositPercent !== null && selected.depositPercent > 0 &&
          <p className="text-sm text-ink/70">Deposit: {selected.depositPercent}%</p>}
        {selected.billingMode === "managed_annual" && selected.initialHostingMonths !== null &&
          <p className="text-sm text-ink/70">Initial hosting: {selected.initialHostingMonths} months</p>}
        <p className="text-sm text-ink/70">{descriptions[selected.billingMode]}</p>
        <p className="text-xs text-ink/60">{selected.handoverPolicy}</p>
      </div>
      <Link href={href} className="mt-auto block rounded bg-catalyst px-5 py-3 text-center font-semibold !text-white hover:bg-catalyst-hover hover:!text-white">
        Enquire about {labels[selected.billingMode]}
      </Link>
    </div>
  );
}
