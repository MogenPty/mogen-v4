import Link from "next/link";
import type { Promotion } from "@/data/promotions";
import type { CatalogueWebPackage } from "@/lib/catalogue/location-offer";
import WebPriceOptions, { type PublicWebPriceChoice } from "@/components/mogen/web-price-options";

export default function WebCataloguePricing({ packages, prices = [], promotions = [], recommendedPackageId }: Readonly<{
  packages: CatalogueWebPackage[];
  prices?: PublicWebPriceChoice[];
  promotions?: Promotion[];
  recommendedPackageId?: string;
}>) {
  const promotionFor = (packageId: string) => promotions.find(promotion => promotion.relatedPackage === packageId);
  const websites = packages.filter((item) => item.websiteIncluded).sort((left, right) => {
    const leftPromotion = promotionFor(left.id);
    const rightPromotion = promotionFor(right.id);
    if (leftPromotion?.isFeatured !== rightPromotion?.isFeatured) return leftPromotion?.isFeatured ? -1 : 1;
    if (Boolean(leftPromotion) !== Boolean(rightPromotion)) return leftPromotion ? -1 : 1;
    if (leftPromotion && rightPromotion && leftPromotion.sortOrder !== rightPromotion.sortOrder)
      return leftPromotion.sortOrder - rightPromotion.sortOrder;
    return left.stage - right.stage;
  });
  const primaryPromotionPackageId = websites.find(item => promotionFor(item.id))?.id;
  const seed = packages.find((item) => item.id === "seed" && !item.websiteIncluded);
  return (
    <section aria-label="Web Development packages">
      <p className="mb-8 max-w-3xl text-ink/70">
        Six website packages, from a first professional presence to a tailored business platform.
        Every package is available across South Africa. Published payment options are shown where approved; otherwise request a tailored quotation.
      </p>
      {websites.length ? (
        <div className="grid grid-cols-1 items-start gap-4 md:grid-cols-2 xl:grid-cols-3">
          {websites.map((item) => {
            const promotion = promotionFor(item.id);
            const primaryPromotion = item.id === primaryPromotionPackageId;
            const recommended = item.id === recommendedPackageId;
            const highlighted = primaryPromotion || recommended;
            return (
              <article key={item.id} className={`rounded-lg border p-7 ${highlighted
                ? "border-catalyst bg-ink text-bone shadow-[0_18px_50px_rgba(0,0,0,0.16)]"
                : promotion ? "border-catalyst/60 bg-catalyst/[0.04]" : "border-ink/15 bg-bone"}`}>
                {(promotion || recommended) && (
                  <div className="mb-4 flex min-h-6 items-start justify-between gap-4">
                    {promotion ? <p className="small-caps text-catalyst">Promotions available</p> : <span />}
                    {recommended && <span className="small-caps bg-catalyst px-3 py-1 text-white">Recommended</span>}
                  </div>
                )}
                <h3 className={`font-display text-2xl font-black ${highlighted ? "text-bone" : "text-ink"}`}>{item.name}</h3>
                <p className={`mt-3 ${highlighted ? "text-bone/70" : "text-ink/70"}`}>{item.summary}</p>
                {prices.every(price => price.packageId !== item.id) && (
                  <p className={`mt-5 text-xl font-bold ${highlighted ? "text-bone" : "text-ink"}`}>{item.pricingLabel}</p>
                )}
                <ul className={`mt-5 space-y-2 text-sm ${highlighted ? "text-bone/80" : "text-ink/80"}`}>
                  {item.features.map((feature) => <li key={feature}>✓ {feature}</li>)}
                </ul>
                {item.seoScope.length > 0 && (
                  <p className={`mt-5 text-sm ${highlighted ? "text-bone/70" : "text-ink/70"}`}>SEO: {item.seoScope.join(" · ")}</p>
                )}
                <WebPriceOptions packageId={item.id} options={prices.filter(price => price.packageId === item.id)}
                  promotions={promotions.filter(activePromotion => activePromotion.relatedPackage === item.id)}
                  tone={highlighted ? "inverse" : "mogen"} />
              </article>
            );
          })}
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
          {promotionFor(seed.id) && <p className="small-caps mt-2 text-catalyst">Promotion available</p>}
          <p className="mt-2 text-ink/70">{seed.summary}. Google Business Profile requires an eligible business and verification.</p>
          <WebPriceOptions packageId={seed.id} options={prices.filter(price => price.packageId === seed.id)}
            promotions={promotions.filter(promotion => promotion.relatedPackage === seed.id)} />
        </div>
      )}
    </section>
  );
}
