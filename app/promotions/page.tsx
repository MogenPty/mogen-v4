import type { Metadata } from "next";
import PageShell from "@/components/mogen/page-shell";
import PromotionCard from "@/components/mogen/promotion-card";
import BlueprintGrid from "@/components/mogen/blueprint-grid";
import MagneticButton from "@/components/mogen/magnet-button";
import { getPublicPromotions } from "@/data/promotions";

export const metadata: Metadata = {
  title: "Promotions — Mogen",
  description:
    "Current and past Mogen promotions — limited offers on websites and managed subscriptions, with clear pricing, eligibility and terms.",
};

export default function PromotionsIndexPage() {
  const promotions = getPublicPromotions();

  return (
    <PageShell
      index="// 01 — Offers"
      label="Promotions"
      title={
        <>
          Promotions, <span className="text-catalyst">plainly stated.</span>
        </>
      }
      intro="Limited Mogen offers with clear pricing, eligibility and terms. Expired promotions stay listed for reference — what you see is what was offered."
    >
      <BlueprintGrid className="bg-bone pb-24">
        <div className="mx-auto max-w-[1600px] px-6 lg:px-10">
          <div className="grid grid-cols-1 gap-px bg-ink/10 md:grid-cols-2">
            {promotions.map((p) => (
              <PromotionCard key={p.slug} promotion={p} />
            ))}
          </div>
        </div>
      </BlueprintGrid>

      <BlueprintGrid className="bg-catalyst py-20 text-white">
        <div className="mx-auto flex max-w-[1600px] flex-col items-start justify-between gap-6 px-6 lg:flex-row lg:items-center lg:px-10">
          <h2 className="font-display text-3xl font-black lg:text-5xl text-balance">
            Not sure which offer fits?
          </h2>
          <div className="flex flex-col gap-3 sm:flex-row">
            <MagneticButton
              as="a"
              href="/contact"
              variant="solid"
              className="bg-ink text-bone hover:bg-bone hover:text-ink"
            >
              Contact Mogen
            </MagneticButton>
            <MagneticButton
              as="a"
              href="/services/web-development"
              variant="outline"
              className="border-white/60 text-white hover:bg-white hover:text-ink dark:hover:text-black"
            >
              View Web Development
            </MagneticButton>
          </div>
        </div>
      </BlueprintGrid>
    </PageShell>
  );
}
