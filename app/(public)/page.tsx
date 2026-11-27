import type { Metadata } from "next";
import { loadActivePromotions, loadFeaturedPromotion } from "@/lib/catalogue/promotions-server";
import { loadPublishedWebCatalogue, loadPublicWebPriceOptions } from "@/lib/catalogue/server";
import { parseEnquiryAttribution } from "@/lib/enquiry/enquiry";
import { pageMetadata } from "@/lib/seo";
import { STATIC_META } from "@/lib/seo/metadata-registry";
import Hero from "@/components/mogen/hero";
import WhatMogenDoes from "@/components/mogen/what-mogen-does";
import WhyMogen from "@/components/mogen/why-mogen";
import Footer from "@/components/mogen/footer";
import Nav from "@/components/mogen/nav";
import JsonLd from "@/components/mogen/json-ld";
import ConversionBar from "@/components/mogen/conversation-bar";
import HomepageOffers from "@/components/mogen/homepage-offers";
import ServicesTrio from "@/components/mogen/services-trio";
import WebsiteQuestionnaire from "@/components/mogen/website-questionnaire";

// Homepage metadata via Next.js API — canonical + OG/Twitter derive from configured site URL.
const homeSeo = pageMetadata({
  path: "/",
  title: STATIC_META["/"].title,
  description: STATIC_META["/"].description,
});
export const metadata: Metadata = {
  ...homeSeo,
  title: {
    absolute: STATIC_META["/"].title,
  },
};

// Homepage regenerates at most hourly so promotion date transitions take effect without redeploy.
export const revalidate = 3600;

interface HomeProps {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}

const PACKAGE_HEADER_IDS = new Set([
  "seed", "sprout", "seedling", "vegetative", "budding", "flowering", "ripening",
]);
const packageCurrency = new Intl.NumberFormat("en-ZA", {
  style: "currency", currency: "ZAR", minimumFractionDigits: 0, maximumFractionDigits: 2,
});

export default async function Home({ searchParams }: Readonly<HomeProps>) {
  const [promotion, webPackages, priceRows] = await Promise.all([
    loadFeaturedPromotion(),
    loadPublishedWebCatalogue(),
    loadPublicWebPriceOptions(),
  ]);

  // Carry allowlisted attribution (utm_*) from the homepage URL into CTAs.
  const attribution = parseEnquiryAttribution((await searchParams) ?? {});
  const fallbackPromotions = webPackages === null ? await loadActivePromotions() : [];

  // Build package tier data for the grid (7 web development tiers).
  // All packages from the DB catalogue are web development packages.
  const webPackageData = webPackages ?? [];
  const webPrices = (priceRows ?? [])
    .filter((p) => p.amountCents !== null)
    .map((p) => ({
      id: p.id,
      packageId: p.packageId,
      billingMode: p.billingMode,
      amountCents: p.amountCents as number,
      setupFeeCents: p.setupFeeCents,
      minimumMonths: p.minimumMonths,
      depositPercent: p.depositPercent,
      initialHostingMonths: p.initialHostingMonths,
      handoverPolicy: p.handoverPolicy,
    }));

  const packagesForGrid = webPackageData.map((pkg) => {
    const prices = webPrices.filter((p) => p.packageId === pkg.id);
    const lowestPrice = prices.reduce<(typeof prices)[number] | undefined>(
      (lowest, price) => !lowest || price.amountCents < lowest.amountCents ? price : lowest,
      undefined,
    );
    const price = lowestPrice && {
      amount: packageCurrency.format(lowestPrice.amountCents / 100).replace(/^R\s+/u, "R"),
      cadence: lowestPrice.billingMode === "managed_monthly" ? "monthly"
        : lowestPrice.billingMode === "managed_annual" ? "annually" : "once-off",
      setupFee: lowestPrice.setupFeeCents ? packageCurrency.format(lowestPrice.setupFeeCents / 100) : undefined,
      minimumMonths: lowestPrice.minimumMonths,
    };

    return {
      id: pkg.id,
      name: pkg.name,
      slug: pkg.id,
      imageSrc: PACKAGE_HEADER_IDS.has(pkg.id)
        ? `/images/mogen/package-scenes/${pkg.id}.webp`
        : undefined,
      summary: pkg.summary,
      description: pkg.description,
      price,
      features: pkg.features,
      seoScope: pkg.seoScope,
      exclusions: pkg.exclusions,
      featured: pkg.id === "sprout",
    };
  });

  return (
    <div className="bg-bone">
      <JsonLd />
      <Nav
        defaultServiceSlug="web-development"
        attribution={attribution}
        featuredPromotion={promotion}
      />
      <main>
        <Hero
          serviceSlug="web-development"
          attribution={attribution}
          featuredPromotion={promotion}
        />
        <WhatMogenDoes numbering={2} />

        <HomepageOffers
          promotion={promotion}
          packages={webPackages === null ? null : packagesForGrid}
          prices={webPrices}
          attribution={attribution}
        />
        {webPackages === null && (
          <WebsiteQuestionnaire numbering={3} initialAttribution={attribution} promotions={fallbackPromotions} />
        )}

        <ServicesTrio featuredServiceSlug="web-development" />
        <WhyMogen numbering={5} />

        <Footer
          defaultServiceSlug="web-development"
          attribution={attribution}
          featuredPromotion={promotion}
        />
      </main>
      <ConversionBar
        defaultServiceSlug="web-development"
        attribution={attribution}
        featuredPromotion={promotion}
      />

    </div>
  );
}
