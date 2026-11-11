import Link from "next/link";
import LocationOfferPayment from "./location-offer-payment";
import type { PublicLocationOffer } from "@/lib/catalogue/location-offer";
import type { PublicWebPriceChoice } from "@/components/mogen/web-price-options";

const currency = (cents: number) => new Intl.NumberFormat("en-ZA", {style:"currency",currency:"ZAR", maximumFractionDigits:0}).format(cents / 100);

export default function LocationWebOffers({ offer, prices = [] }: Readonly<{ offer: PublicLocationOffer; prices?: PublicWebPriceChoice[] }>) {
  return (
    <section aria-labelledby="location-website-plans" className="bg-bone px-6 py-16 lg:px-10 lg:py-24">
      <div className="mx-auto max-w-[1600px]">
        <p className="small-caps text-catalyst">Web development in {offer.locationSlug}</p>
        <h2 id="location-website-plans" className="mt-3 font-display text-4xl font-black text-ink lg:text-5xl">
          Find the right website for your business
        </h2>
        <p className="mt-4 max-w-2xl text-ink/70">
          Our featured option is a local recommendation, not a restriction. Every Mogen package is available in every location.
        </p>
        <div className="mt-10 grid grid-cols-1 gap-4 lg:grid-cols-4">
          {offer.slots.map((slot, index) => (
            slot.kind === "explore" ? (
              <div key={`explore-${index}`} className="flex flex-col justify-center rounded-lg border border-dashed border-ink/20 bg-ink/[0.025] p-6 lg:my-3">
                <h3 className="font-display text-xl font-bold text-ink">
                  Need something {slot.direction === "smaller" ? "smaller" : "larger"}?
                </h3>
                <p className="mt-3 text-sm text-ink/70">Explore the complete package range to find a better fit.</p>
                <Link className="mt-5 font-semibold text-catalyst underline" href="/services/web-development#pricing">
                  Explore packages
                </Link>
              </div>
            ) : (
              <article key={slot.package.id} className={`relative flex flex-col rounded-xl border p-7 transition-transform ${slot.featured ? "z-10 border-catalyst bg-catalyst text-white shadow-xl ring-2 ring-catalyst/25 lg:-my-3 lg:scale-[1.045] lg:p-8" : "border-ink/15 bg-bone text-ink lg:my-3"}`}>
                {slot.featured && <span className="small-caps w-fit rounded-full border border-white/50 bg-white/15 px-3 py-1 font-bold text-white">Recommended for this location</span>}
                <h3 className={`mt-3 font-display font-black ${slot.featured ? "text-3xl text-white" : "text-2xl text-ink"}`}>{slot.package.name}</h3>
                <p className={`mt-3 text-sm ${slot.featured ? "text-white/90" : "text-ink/70"}`}>{slot.package.summary}</p>
                <ul className={`mt-5 flex-1 space-y-2 text-sm ${slot.featured ? "text-white/95" : "text-ink/80"}`}>
                  {slot.package.features.slice(0, 4).map(feature => <li key={feature}>✓ {feature}</li>)}
                </ul>
                <LocationOfferPayment packageId={slot.package.id} packageName={slot.package.name} featured={slot.featured} options={prices.filter(price => price.packageId === slot.package.id)} />
              </article>
            )
          ))}
        </div>
        <div className="mt-8 rounded-lg border border-ink/15 bg-secondary p-5">
          <h3 className="font-display text-xl font-bold text-ink">Seed — Not ready for a website?</h3>
          <p className="mt-2 text-sm text-ink/70">{offer.seedCallout} Google Business Profile availability is subject to eligibility and verification.</p>
          {prices.some(p => p.packageId === "seed" && p.billingMode === "once_off") && <p className="mt-3 font-bold text-ink">{currency(prices.find(p => p.packageId === "seed" && p.billingMode === "once_off")!.amountCents)} once-off</p>}
          <Link href={`/contact?service=web-development&package=seed${prices.find(p => p.packageId === "seed" && p.billingMode === "once_off") ? `&priceOption=${encodeURIComponent(prices.find(p => p.packageId === "seed" && p.billingMode === "once_off")!.id)}` : ""}`} className="mt-3 inline-block font-semibold text-catalyst underline">Ask about Seed</Link>
        </div>
      </div>
    </section>
  );
}
