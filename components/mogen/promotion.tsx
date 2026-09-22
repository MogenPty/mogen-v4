"use client";

import Link from "next/link";
import BlueprintGrid, { SectionLabel } from "./blueprint-grid";
import MagneticButton from "./magnet-button";
import { getActivePromotion } from "@/data/promotions";

export default function Promotion() {
  const promo = getActivePromotion();
  if (!promo) return null;

  const formattedOriginal = `R${promo.originalPrice}`;
  const formattedPromo = `R${promo.promotionalPrice}`;

  return (
    <BlueprintGrid id="promotion" className="bg-bone py-24 lg:py-32">
      <div className="mx-auto max-w-[1600px] px-6 lg:px-10">
        <SectionLabel index="// 05 — Promotion" title="Current Offer" />
        <div className="grid grid-cols-1 gap-px bg-ink/10 lg:grid-cols-[1.2fr_0.8fr]">
          <div className="bg-bone p-8 lg:p-12">
            <span className="small-caps text-catalyst">Featured</span>
            <h2 className="mt-3 font-display text-4xl font-black leading-[1.05] text-ink lg:text-5xl text-balance">
              {promo.title}
            </h2>
            <p className="mt-4 max-w-xl text-lg leading-relaxed text-ink/70">
              {promo.description}
            </p>
            <div className="mt-8 flex items-baseline gap-4">
              <span className="font-display text-5xl font-black text-catalyst lg:text-6xl">
                {formattedPromo}
              </span>
              <span className="text-xl text-ink/40 line-through">
                {formattedOriginal}
              </span>
            </div>
            <p className="mt-2 text-sm text-ink/60">
              Regular price{" "}
              <span className="line-through">{formattedOriginal}</span> — now{" "}
              <span className="font-semibold text-ink">{formattedPromo}</span> while the promotion is active.
            </p>
            {promo.terms && (
              <p className="mt-6 text-xs leading-relaxed text-ink/50">{promo.terms}</p>
            )}
            <div className="mt-8 flex flex-wrap gap-4">
              <MagneticButton as="a" href={promo.cta.href} variant="catalyst">
                {promo.cta.label}
              </MagneticButton>
              <MagneticButton as="a" href={`/services/${promo.relatedService}`} variant="outline">
                View service
              </MagneticButton>
            </div>
          </div>
          <div className="flex flex-col justify-between bg-ink p-8 text-bone lg:p-12">
            <div>
              <h3 className="font-display text-xl font-black">What&apos;s included</h3>
              <ul className="mt-6 space-y-3 text-sm text-bone/80">
                <li className="flex gap-2">
                  <span className="mt-1 h-1 w-1 shrink-0 bg-catalyst" aria-hidden="true" />
                  Starter website structure tailored to your business
                </li>
                <li className="flex gap-2">
                  <span className="mt-1 h-1 w-1 shrink-0 bg-catalyst" aria-hidden="true" />
                  Mobile-first, fast and structured for discovery
                </li>
                <li className="flex gap-2">
                  <span className="mt-1 h-1 w-1 shrink-0 bg-catalyst" aria-hidden="true" />
                  Contact / enquiry path set up
                </li>
                <li className="flex gap-2">
                  <span className="mt-1 h-1 w-1 shrink-0 bg-catalyst" aria-hidden="true" />
                  Clear next steps for SEO and growth
                </li>
              </ul>
            </div>
            <div className="mt-10 border-t border-bone/10 pt-6">
              <p className="text-sm text-bone/60">
                Not WaaS. This is Mogen Seed — a starter website offer.
              </p>
              <Link
                href="/contact"
                className="mt-3 inline-flex small-caps text-catalyst hover:text-bone"
              >
                Questions? Contact us →
              </Link>
            </div>
          </div>
        </div>
      </div>
    </BlueprintGrid>
  );
}
