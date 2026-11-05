import Link from "next/link";
import type { PublicLocationOffer } from "@/lib/catalogue/location-offer";

export default function LocationWebOffers({ offer }: Readonly<{ offer: PublicLocationOffer }>) {
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
                <p className={`mt-5 font-semibold ${slot.featured ? "text-white" : "text-ink"}`}>{slot.package.pricingLabel}</p>
                <ul className={`mt-5 flex-1 space-y-2 text-sm ${slot.featured ? "text-white/95" : "text-ink/80"}`}>
                  {slot.package.features.slice(0, 4).map(feature => <li key={feature}>✓ {feature}</li>)}
                </ul>
                <Link className={`mt-7 inline-flex justify-center rounded px-4 py-3 font-semibold transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 ${slot.featured ? "bg-white text-ink hover:bg-bone focus-visible:outline-white" : "bg-catalyst text-white hover:bg-ink focus-visible:outline-catalyst"}`} href={`/contact?service=web-development&package=${encodeURIComponent(slot.package.id)}`}>
                  Enquire about {slot.package.name}
                </Link>
              </article>
            )
          ))}
        </div>
        <div className="mt-8 rounded-lg border border-ink/15 bg-secondary p-5">
          <h3 className="font-display text-xl font-bold text-ink">Seed — Not ready for a website?</h3>
          <p className="mt-2 text-sm text-ink/70">{offer.seedCallout} Google Business Profile availability is subject to eligibility and verification.</p>
          <Link href="/contact?service=web-development&package=seed" className="mt-3 inline-block font-semibold text-catalyst underline">Ask about Seed</Link>
        </div>
      </div>
    </section>
  );
}
