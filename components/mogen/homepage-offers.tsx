"use client";

import { useState } from "react";
import type { Promotion } from "@/data/promotions";
import type { EnquiryAttribution } from "@/lib/enquiry/enquiry";
import EnquiryModal, { type EnquiryContext, type EnquiryPaymentOption } from "./enquiry-modal";
import PackageTierGrid, { type PackageTierGridProps } from "./package-tier-grid";
import HomepagePromotionCard from "./homepage-promotion-card";

type OfferContext = Extract<EnquiryContext, { type: "package" | "promotion" }>;

interface HomepageOffersProps {
  promotion?: Promotion;
  packages: PackageTierGridProps["packages"] | null;
  prices: EnquiryPaymentOption[];
  attribution?: EnquiryAttribution;
}

export default function HomepageOffers({
  promotion,
  packages,
  prices,
  attribution,
}: Readonly<HomepageOffersProps>) {
  const [context, setContext] = useState<OfferContext | null>(null);

  return (
    <>
      {promotion && (
        <HomepagePromotionCard
          promotion={promotion}
          attribution={attribution}
          onEnquireClick={(offer) => setContext({ type: "promotion", promotion: offer })}
        />
      )}
      {packages && (
        <PackageTierGrid
          packages={packages}
          attribution={attribution}
          onEnquireClick={(packageId) => setContext({ type: "package", packageId })}
        />
      )}
      {context && (
        <EnquiryModal
          open
          onClose={() => setContext((current) => current === context ? null : current)}
          context={context}
          packageName={packages?.find((pkg) => pkg.id === (context.type === "package" ? context.packageId : context.promotion.relatedPackage))?.name}
          prices={prices}
          attribution={attribution}
        />
      )}
    </>
  );
}
