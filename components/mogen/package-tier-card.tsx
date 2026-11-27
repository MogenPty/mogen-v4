"use client";

import { ArrowRight, Check } from "lucide-react";
import { withAttribution } from "@/lib/enquiry/enquiry";
import MagneticButton from "./magnet-button";

export interface PackageTierCardProps {
  /** Package identifier from registry (e.g., "seed", "sprout"). */
  id: string;
  /** Display name (e.g., "Seed", "Sprout"). */
  name: string;
  summary: string;
  description: string;
  price?: {
    amount: string;
    cadence: string;
    setupFee?: string;
    minimumMonths: number | null;
  };
  features: string[];
  seoScope: string[];
  exclusions: string[];
  /** Whether this tier is featured/recommended. */
  featured?: boolean;
  /** Package slug for link. */
  slug: string;
  imageSrc?: string;
  /** UTM attribution. */
  attribution?: import("@/lib/enquiry/enquiry").EnquiryAttribution;
  /** Called when CTA clicked — opens enquiry modal with package context. Provided by parent grid. */
  onEnquireClick?: (pkgId: string) => void;
}

const sproutBenefits: Record<string, string> = {
  "Up to five page sections": "Give visitors one clear page to learn what you offer, why to choose you and how to reach you.",
  "Contact CTA": "Give interested visitors a clear next step so they can turn a visit into an enquiry.",
  "Mobile-responsive design": "Keep your services and contact information easy to read and use on phones as well as desktops.",
  "Basic indexability": "Lay the groundwork for search engines to discover your website.",
  "Page metadata": "Give search engines a clear title and description to understand what your page is about.",
};

export default function PackageTierCard({
  id,
  name,
  summary,
  description,
  price,
  features,
  seoScope,
  exclusions,
  featured,
  slug,
  attribution,
  onEnquireClick,
}: Readonly<PackageTierCardProps>) {
  const groups = [
    { label: "What you get", items: features },
    { label: "Search foundations", items: seoScope },
  ];

  return (
    <article aria-label={name} className="surface-dark flex flex-col px-5 pb-6 text-white sm:px-7">
      {featured && (
        <span className="mb-2 text-sm font-semibold text-white/85">
          Recommended
        </span>
      )}

      <p className="text-lg font-semibold">{summary}</p>
      {description && description !== summary && <p className="mt-1 text-sm leading-relaxed text-white/85">{description}</p>}

      <div className="mt-5 border-y border-white/25 py-3">
        <p className="font-display text-2xl font-black">{price ? `From ${price.amount}` : "Request a quote"}</p>
        {price && (
          <p className="mt-1 text-sm text-white/85">
            {price.cadence}
            {price.setupFee && ` · ${price.setupFee} setup`}
            {price.minimumMonths ? ` · ${price.minimumMonths}-month minimum` : ""}
          </p>
        )}
      </div>

      <div className="mt-5 grid gap-5 sm:grid-cols-2">
        {groups.filter(({ items }) => items.length).map(({ label, items }) => (
          <div key={label}>
            <h3 className="mb-2 font-semibold">{label}</h3>
            <ul className="space-y-2">
              {items.map((item) => (
                <li key={item} className="flex gap-2 text-sm">
                  <Check className="mt-0.5 h-4 w-4 shrink-0 text-white/80" aria-hidden="true" />
                  <div>
                    <p>{item}</p>
                    {id === "sprout" && sproutBenefits[item] && (
                      <p className="mt-0.5 leading-relaxed text-white/80">{sproutBenefits[item]}</p>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
      {exclusions.length > 0 && (
        <p className="mt-5 text-xs leading-relaxed text-white/80">Outside this package: {exclusions.join(", ")}.</p>
      )}

      <div className="mt-6 flex flex-wrap gap-3">
        <MagneticButton
          type="button"
          variant="catalyst"
          onClick={() => onEnquireClick?.(id)}
          className="flex-1"
        >
          Enquire
        </MagneticButton>
        <MagneticButton
          as="a"
          href={withAttribution(`/services/web-development#${slug}`, attribution)}
          variant="outline-on-dark"
          className="flex-1"
        >
          Details <ArrowRight className="h-4 w-4" />
        </MagneticButton>
      </div>
    </article>
  );
}
