import Link from "next/link";
import type { CatalogueWebPackage } from "@/lib/catalogue/location-offer";

export default function WebCataloguePricing({ packages }: Readonly<{ packages: CatalogueWebPackage[] }>) {
  const websites = packages.filter((item) => item.websiteIncluded);
  const seed = packages.find((item) => item.id === "seed" && !item.websiteIncluded);
  return (
    <section aria-label="Web Development packages">
      <p className="mb-8 max-w-3xl text-ink/70">
        Six website packages, from a first professional presence to a tailored business platform.
        Every package is available across South Africa. Pricing is confirmed against your requirements.
      </p>
      {websites.length ? (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {websites.map((item) => (
            <article key={item.id} className="flex flex-col rounded-lg border border-ink/15 bg-bone p-7">
              <h3 className="font-display text-2xl font-black text-ink">{item.name}</h3>
              <p className="mt-3 text-ink/70">{item.summary}</p>
              <p className="mt-5 text-xl font-bold text-ink">{item.pricingLabel}</p>
              <ul className="mt-5 flex-1 space-y-2 text-sm text-ink/80">
                {item.features.map((feature) => <li key={feature}>✓ {feature}</li>)}
              </ul>
              {item.seoScope.length > 0 && (
                <p className="mt-5 text-sm text-ink/70">SEO: {item.seoScope.join(" · ")}</p>
              )}
              <Link className="mt-7 rounded bg-catalyst px-5 py-3 text-center font-semibold text-white"
                href={`/contact?service=web-development&package=${encodeURIComponent(item.id)}`}>
                Request {item.name} quote
              </Link>
            </article>
          ))}
        </div>
      ) : (
        <div className="rounded-lg border border-ink/15 bg-secondary p-8">
          <p className="font-semibold text-ink">Our updated website packages are being finalised.</p>
          <Link className="mt-4 inline-block text-catalyst underline" href="/contact?service=web-development">
            Discuss your requirements with Mogen
          </Link>
        </div>
      )}
      {seed && (
        <div className="mt-8 rounded-lg border border-ink/15 bg-secondary p-6">
          <h3 className="font-display text-xl font-bold text-ink">Seed — Not ready for a website?</h3>
          <p className="mt-2 text-ink/70">{seed.summary}. Google Business Profile requires an eligible business and verification.</p>
          <p className="mt-2 font-semibold text-ink">{seed.pricingLabel}</p>
          <Link className="mt-3 inline-block text-catalyst underline" href="/contact?service=web-development&package=seed">Ask about Seed</Link>
        </div>
      )}
    </section>
  );
}
