"use client";

import { ArrowRight } from "lucide-react";
import BlueprintGrid from "./blueprint-grid";
import MagneticButton from "./magnet-button";

export default function AuditGrid() {
  return (
    <BlueprintGrid className="bg-catalyst py-20 text-white">
      <div className="mx-auto flex max-w-[1600px] flex-col items-start justify-between gap-6 px-6 lg:flex-row lg:items-center lg:px-10">
        <h2 className="font-display text-3xl font-black lg:text-4xl text-balance">
          Want a stack engineered for your growth?
        </h2>
        <div className="flex flex-col gap-3 sm:flex-row">
          <MagneticButton
            as="a"
            href="/#audit"
            variant="solid"
            className="bg-ink text-bone hover:bg-bone hover:text-ink"
          >
            Get Free Audit
          </MagneticButton>
          <MagneticButton
            as="a"
            href="/contact"
            variant="outline"
            className="border-white/60 text-white hover:bg-white hover:text-ink"
          >
            Talk to Us <ArrowRight className="h-4 w-4" />
          </MagneticButton>
        </div>
      </div>
    </BlueprintGrid>
  );
}
