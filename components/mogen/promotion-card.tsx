import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  getEffectiveStatus,
  getPromotionStatusLabel,
  type Promotion,
} from "@/data/promotions";
import type { EnquiryAttribution } from "@/lib/enquiry/enquiry";
import { withAttribution } from "@/lib/enquiry/enquiry";
import PromotionEnquiryCta from "./promotion-enquiry-cta";

export function PromotionStatusBadge({
  status,
  isFeatured,
}: Pick<Promotion, "status" | "isFeatured">) {
  return (
    <span className="flex flex-wrap items-center gap-2">
      <span
        className={cn(
          "small-caps border px-3 py-1",
          status === "active" &&
            "border-catalyst/40 bg-catalyst/10 text-catalyst",
          status === "scheduled" &&
            "border-ink/20 bg-ink/5 text-ink/70 group-hover:border-bone/30 group-hover:bg-bone/10 group-hover:text-bone/70",
          status === "expired" && "border-ink/20 bg-ink text-bone",
        )}
      >
        {getPromotionStatusLabel(status)}
      </span>
      {isFeatured && status === "active" && (
        <span className="small-caps text-catalyst">Featured</span>
      )}
    </span>
  );
}

function PriceSummary({ promotion }: { promotion: Promotion }) {
  const lines = promotion.pricing.filter((p) => p.promotional);
  const shown = lines.length > 0 ? lines : promotion.pricing.slice(0, 1);
  return (
    <div className="mt-6 space-y-2">
      {shown.map((p) => (
        <div key={p.label} className="flex flex-wrap items-baseline gap-x-3">
          <span className="small-caps text-ink/50 group-hover:text-bone/50">{p.label}</span>
          {p.promotional ? (
            <>
              <span className="font-display text-3xl font-black text-catalyst">
                {p.promotional}
                {p.cadence && (
                  <span className="text-base font-bold text-ink/50 group-hover:text-bone/50">
                    {" "}
                    {p.cadence}
                  </span>
                )}
              </span>
              <span className="text-lg text-ink/40 line-through group-hover:text-bone/40">
                {" "}
                {p.regular}
              </span>
            </>
          ) : (
            <span className="font-display text-3xl font-black text-ink group-hover:text-bone">
              {p.regular}
              {p.cadence && (
                <span className="text-base font-bold text-ink/50 group-hover:text-bone/50">
                  {" "}
                  {p.cadence}
                </span>
              )}
            </span>
          )}
        </div>
      ))}
    </div>
  );
}

export default function PromotionCard({
  promotion,
  attribution,
}: Readonly<{ promotion: Promotion; attribution?: EnquiryAttribution }>) {
  const status = getEffectiveStatus(promotion);
  const expired = status === "expired";
  const detailHref = withAttribution(
    `/promotions/${promotion.slug}`,
    attribution,
  );
  return (
    <article
      className={cn(
        "group relative flex flex-col bg-bone p-8 transition-colors hover:bg-ink hover:text-bone",
        expired && "opacity-90",
      )}
      aria-label={`${promotion.name} — ${getPromotionStatusLabel(status)}`}
    >
      {expired && (
        <span
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-0 top-1/2 -translate-y-1/2 rotate-[-4deg] border-y-2 border-catalyst/70 bg-ink/80 py-1 text-center small-caps text-bone"
        >
          Promotion ended
        </span>
      )}
      <PromotionStatusBadge
        status={status}
        isFeatured={promotion.isFeatured}
      />
      <h3 className="mt-4 font-display text-2xl font-black leading-tight">
        {promotion.name}
      </h3>
      <p className="mt-3 flex-1 text-sm opacity-80">
        {promotion.shortDescription}
      </p>
      <PriceSummary promotion={promotion} />
      <div className="mt-6 flex flex-wrap items-center gap-4">
        {!expired && (
          <PromotionEnquiryCta promotion={promotion} attribution={attribution} />
        )}
        <Link
          href={detailHref}
          className="flex items-center gap-2 small-caps text-catalyst"
        >
          View promotion
          <ArrowRight
            className="h-4 w-4 transition-transform group-hover:translate-x-1"
            aria-hidden="true"
          />
        </Link>
      </div>
    </article>
  );
}
