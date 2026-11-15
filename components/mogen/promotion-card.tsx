import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  getEffectiveStatus,
  getPromotionStatusLabel,
  needsCadenceSuffix,
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
  const groups = shown.reduce<Array<{ id: string; lines: Promotion["pricing"] }>>((result, line, index) => {
    const id = line.priceOptionId ?? `${line.label}-${index}`;
    const existing = result.find(group => group.id === id);
    if (existing) existing.lines.push(line);
    else result.push({ id, lines: [line] });
    return result;
  }, []);
  return (
    <div className="mt-6 space-y-3">
      {groups.map((group, index) => {
        const primary = group.lines.find(line => line.appliesTo !== "setup" && line.label.toLowerCase() !== "setup fee");
        const setupLines = group.lines.filter(line => line !== primary);
        return <div
          key={group.id}
          className={cn(
            "space-y-1.5",
            index > 0 && "border-t border-ink/15 pt-3 group-hover:border-bone/15",
          )}
        >
          {primary && (
            <div className="flex flex-wrap items-baseline gap-x-3">
              <span className="small-caps text-ink/50 group-hover:text-bone/50">{primary.label}</span>
              {primary.promotional ? (
                <>
                  <span className="font-display text-3xl font-black text-catalyst">
                    {primary.promotional}
                    {needsCadenceSuffix(primary.promotional, primary.cadence) && (
                      <span className="text-base font-bold text-ink/50 group-hover:text-bone/50"> {primary.cadence}</span>
                    )}
                  </span>
                  <span className="text-lg text-ink/40 line-through group-hover:text-bone/40">{primary.regular}</span>
                </>
              ) : (
                <span className="font-display text-3xl font-black text-ink group-hover:text-bone">
                  {primary.regular}
                  {needsCadenceSuffix(primary.regular, primary.cadence) && (
                    <span className="text-base font-bold text-ink/50 group-hover:text-bone/50"> {primary.cadence}</span>
                  )}
                </span>
              )}
            </div>
          )}
          {setupLines.map(line => (
            <p key={`${line.label}-${line.appliesTo ?? "setup"}`} className="flex flex-wrap items-baseline gap-x-2 text-sm text-ink/60 group-hover:text-bone/60">
              <span className="small-caps">{line.label}</span>
              <strong className="text-base text-catalyst">{line.promotional ?? line.regular}</strong>
              {needsCadenceSuffix(line.promotional ?? line.regular, line.cadence) && <span className="font-semibold">{line.cadence}</span>}
              {line.promotional && <span className="line-through opacity-70">{line.regular}</span>}
            </p>
          ))}
        </div>
      })}
    </div>
  );
}

export default function PromotionCard({
  promotion,
  attribution,
}: Readonly<{ promotion: Promotion; attribution?: EnquiryAttribution }>) {
  const status = getEffectiveStatus(promotion);
  const expired = status === "expired";
  const claimable = status === "active";
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
        {claimable && (
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
