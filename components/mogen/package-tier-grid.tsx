import { useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import Image from "next/image";
import { cn } from "@/lib/utils";
import BlueprintGrid, { SectionLabel } from "./blueprint-grid";
import PackageTierCard, { PackageTierCardProps } from "./package-tier-card";

const panelEase = [0.32, 0, 0.2, 1] as const;

export interface PackageTierGridProps {
  /** Array of package tier data for display. */
  packages: PackageTierCardProps[];
  /** UTM attribution. */
  attribution?: import("@/lib/enquiry/enquiry").EnquiryAttribution;
  /** Called when any package CTA is clicked — opens enquiry modal. */
  onEnquireClick: (pkgId: string) => void;
}

export default function PackageTierGrid({
  packages,
  attribution,
  onEnquireClick,
}: Readonly<PackageTierGridProps>) {
  const [selected, setSelected] = useState(packages.find((pkg) => pkg.featured)?.id ?? packages[0]?.id);
  const reduceMotion = useReducedMotion();

  return (
    <BlueprintGrid id="packages" className="bg-bone py-20 lg:py-28">
      <div className="mx-auto max-w-[1600px] px-6 lg:px-10">
        <SectionLabel index={`// 3 — Packages`} title="Website Packages" />
        <p className="mt-8 max-w-3xl text-lg text-ink/70">
          Select a package to see what it includes and check its starting price.
        </p>
        {packages.length === 0 && (
          <p className="mt-6 text-ink/70">Package pricing is currently unavailable. <a href="/contact" className="underline">Contact us for a quote.</a></p>
        )}

        <div className="mt-10 flex flex-col gap-2 lg:min-h-125 lg:flex-row">
          {packages.map((pkg) => {
            const expanded = pkg.id === selected;
            const triggerId = `package-trigger-${pkg.id}`;
            const panelId = `package-panel-${pkg.id}`;

            return (
              <motion.div
                key={pkg.id}
                initial={false}
                animate={{ "--panel-grow": expanded ? 1 : 0 }}
                transition={{ duration: reduceMotion ? 0 : 0.56, ease: panelEase }}
                className="group/panel relative isolate flex min-w-0 shrink-0 flex-col overflow-hidden rounded-xl border border-white/15 bg-[#111b15] lg:grow-(--panel-grow) lg:basis-[4.75rem] xl:basis-24"
              >
                {pkg.imageSrc && (
                  <motion.div
                    aria-hidden="true"
                    initial={false}
                    animate={{ scale: expanded || reduceMotion ? 1 : 1.08 }}
                    transition={{ duration: reduceMotion ? 0 : 0.8, ease: panelEase }}
                    className="pointer-events-none absolute inset-0"
                  >
                    <Image
                      src={pkg.imageSrc}
                      alt=""
                      fill
                      sizes="(min-width: 1024px) 70vw, 100vw"
                      className={cn(
                        "object-cover object-center motion-safe:transition-[filter] motion-safe:duration-500",
                        !expanded && "grayscale group-hover/panel:grayscale-0 group-focus-within/panel:grayscale-0",
                      )}
                    />
                  </motion.div>
                )}
                <div aria-hidden="true" className={cn(
                  "pointer-events-none absolute inset-0",
                  expanded
                    ? "bg-[linear-gradient(180deg,rgba(5,14,9,.77),rgba(5,14,9,.32)_18%,rgba(5,14,9,.86)_43%,rgba(5,14,9,.94))]"
                    : "bg-linear-to-t from-black/95 via-black/50 to-black/15",
                )} />
                <button
                  id={triggerId}
                  type="button"
                  aria-expanded={expanded}
                  aria-controls={panelId}
                  onClick={() => setSelected(pkg.id)}
                  className={cn(
                    "relative block w-full shrink-0 text-left text-white focus-visible:z-20 focus-visible:outline-2 focus-visible:-outline-offset-4 focus-visible:outline-white",
                    expanded ? "h-32 sm:h-40" : "h-20 cursor-pointer lg:h-full",
                  )}
                >
                  <span className={cn(
                    "absolute z-10 origin-left -translate-y-1/2 whitespace-nowrap font-display text-4xl leading-none font-black tracking-tight motion-safe:transition-[top,left,rotate,scale] motion-safe:duration-[560ms] motion-safe:ease-[cubic-bezier(0.32,0,0.2,1)]",
                    expanded
                      ? "top-12 left-5 rotate-0 scale-100 sm:left-7"
                      : "top-10 left-5 rotate-0 scale-[.63] lg:top-64 lg:left-[2.375rem] lg:-rotate-90 xl:left-12",
                  )}>{pkg.name}</span>
                  {!expanded && (
                    <span className="absolute top-1/2 right-3 -translate-y-1/2 text-right lg:inset-x-1 lg:top-auto lg:bottom-5 lg:translate-y-0 lg:text-center">
                      {pkg.price ? (
                        <>
                          <span className="block text-[0.65rem] font-semibold text-white/85">From</span>
                          <span className="block font-display text-sm leading-tight font-black text-white tabular-nums xl:text-base">{pkg.price.amount}</span>
                          <span className="block text-[0.65rem] font-semibold text-white/85">{pkg.price.cadence}</span>
                        </>
                      ) : <span className="font-display text-sm font-bold">Get a quote</span>}
                    </span>
                  )}
                </button>
                <div id={panelId} role="region" aria-labelledby={triggerId} hidden={!expanded} className="relative">
                  {expanded && (
                    <motion.div
                      initial={reduceMotion ? false : { opacity: 0, y: 12 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: reduceMotion ? 0 : 0.38, delay: reduceMotion ? 0 : 0.16, ease: panelEase }}
                    >
                      <PackageTierCard {...pkg} attribution={attribution} onEnquireClick={onEnquireClick} />
                    </motion.div>
                  )}
                </div>
              </motion.div>
            );
          })}
        </div>

        <p className="mt-8 text-sm text-ink/50">
          All prices in ZAR. Managed plans include hosting, maintenance, email and support.
          Self-hosted and once-off options available per tier.
        </p>
      </div>
    </BlueprintGrid>
  );
}
