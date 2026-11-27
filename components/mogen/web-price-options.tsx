"use client";

import Link from "next/link";
import { useState } from "react";
import MogenSelect from "@/components/mogen/mogen-select";
import type { Promotion } from "@/data/promotions";
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

export type OpenWebEnquiry = (packageId: string, priceOptionId?: string, promotion?: Promotion) => void;

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

const priority: Record<BillingMode, number> = { managed_monthly: 0, managed_annual: 1, self_hosted: 2, once_off: 3 };

const zar = (amount: number) =>
  new Intl.NumberFormat("en-ZA", { style: "currency", currency: "ZAR" }).format(amount / 100);

export default function WebPriceOptions({
  packageId,
  options,
  promotions = [],
  tone = "mogen",
  onEnquire,
}: Readonly<{
  packageId: string;
  options: PublicWebPriceChoice[];
  promotions?: Promotion[];
  tone?: "mogen" | "inverse";
  onEnquire?: OpenWebEnquiry;
}>) {
  const inverse = tone === "inverse";
  const sortedOptions = [...options].sort((a, b) => priority[a.billingMode] - priority[b.billingMode]);
  const [selectedId, setSelectedId] = useState("");
  const selected = sortedOptions.find(option => option.id === selectedId);
  const enquiryClass = "block w-full cursor-pointer rounded bg-catalyst px-5 py-3 text-center font-semibold !text-white hover:bg-catalyst-hover hover:!text-white";
  if (!sortedOptions.length) {
    return onEnquire ? (
      <button type="button" onClick={() => onEnquire(packageId)} className={`mt-7 ${enquiryClass}`}>
        Request a quote
      </button>
    ) : (
      <Link href={`/contact?service=web-development&package=${encodeURIComponent(packageId)}`} className={`mt-7 ${enquiryClass}`}>
        Request a quote
      </Link>
    );
  }
  const selectedPromotion = selected
    ? promotions.find(promotion => (promotion.targetPriceOptionIds ?? [promotion.targetPriceOptionId])
      .filter(Boolean).includes(selected.id))
    : undefined;
  const promotionLines = selectedPromotion?.pricing.filter(line => line.priceOptionId === selected?.id) ?? [];
  const mainPromotion = promotionLines.find(line => line.appliesTo !== "setup");
  const setupPromotion = promotionLines.find(line => line.appliesTo === "setup");
  const href = selected
    ? `/contact?service=web-development&package=${encodeURIComponent(packageId)}&priceOption=${encodeURIComponent(selected.id)}${selectedPromotion ? `&promotion=${encodeURIComponent(selectedPromotion.slug)}` : ""}`
    : "";
  return (
    <div className={`mt-5 border-t pt-5 ${inverse ? "border-bone/20" : "border-ink/15"}`}>
      <label htmlFor={`billing-${packageId}`} className={`small-caps ${inverse ? "text-bone/70" : "text-ink/70"}`}>
        How would you like to pay?
      </label>
      <MogenSelect id={`billing-${packageId}`} value={selectedId} onChange={setSelectedId}
        placeholder="Choose a payment option" tone={tone} className="mt-2"
        options={sortedOptions.map(option => ({
          value: option.id,
          label: `${labels[option.billingMode]} — ${zar(option.amountCents)}${option.billingMode === "managed_monthly" ? "/month" : option.billingMode === "managed_annual" ? "/year" : " once-off"}`,
        }))} />
      {selected ? (
        <div aria-live="polite" className={`mt-4 space-y-2 rounded-lg p-4 ${inverse ? "bg-bone/5" : "bg-ink/5"}`}>
          {selectedPromotion && <p className="small-caps text-catalyst">{selectedPromotion.name}</p>}
          <p className={`font-display text-2xl font-black ${inverse ? "text-bone" : "text-ink"}`}>
            {mainPromotion?.promotional ? <><span className={`mr-2 text-base font-semibold line-through ${inverse ? "text-bone/45" : "text-ink/45"}`}>{mainPromotion.regular}</span>{mainPromotion.promotional}</> : zar(selected.amountCents)}
            {selected.billingMode === "managed_monthly" ? "/month" : selected.billingMode === "managed_annual" ? "/year" : " once-off"}
          </p>
          {mainPromotion?.note && <p className={`text-sm ${inverse ? "text-bone/70" : "text-ink/70"}`}>{mainPromotion.note}</p>}
          {selected.setupFeeCents !== null && selected.setupFeeCents > 0 && (
            <div className={`text-sm ${inverse ? "text-bone/70" : "text-ink/70"}`}>
              <p>One-time setup fee: {setupPromotion?.promotional
                ? <><span className="mr-2 line-through">{setupPromotion.regular}</span><strong className="text-catalyst">{setupPromotion.promotional}</strong></>
                : zar(selected.setupFeeCents)}</p>
              {setupPromotion?.note && <p className="mt-1">{setupPromotion.note}</p>}
            </div>
          )}
          {selected.minimumMonths !== null && selected.minimumMonths > 0 && <p className={`text-sm ${inverse ? "text-bone/70" : "text-ink/70"}`}>Minimum term: {selected.minimumMonths} months</p>}
          {selected.depositPercent !== null && selected.depositPercent > 0 && <p className={`text-sm ${inverse ? "text-bone/70" : "text-ink/70"}`}>Deposit: {selected.depositPercent}%</p>}
          {selected.billingMode === "managed_annual" && selected.initialHostingMonths !== null && <p className={`text-sm ${inverse ? "text-bone/70" : "text-ink/70"}`}>Initial hosting: {selected.initialHostingMonths} months</p>}
          <p className={`text-sm ${inverse ? "text-bone/70" : "text-ink/70"}`}>{descriptions[selected.billingMode]}</p>
          <p className={`text-xs ${inverse ? "text-bone/60" : "text-ink/60"}`}>{selected.handoverPolicy}</p>
          {onEnquire ? (
            <button type="button" onClick={() => onEnquire(packageId, selected.id, selectedPromotion)} className={`mt-3 ${enquiryClass}`}>
              Enquire about {labels[selected.billingMode]}
            </button>
          ) : (
            <Link href={href} className={`mt-3 ${enquiryClass}`}>
              Enquire about {labels[selected.billingMode]}
            </Link>
          )}
        </div>
      ) : (
        <p className={`mt-3 text-sm ${inverse ? "text-bone/60" : "text-ink/60"}`}>Select a payment option to see its price, terms and enquiry button.</p>
      )}
    </div>
  );
}
