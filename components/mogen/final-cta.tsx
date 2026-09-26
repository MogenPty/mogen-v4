import { formatNumber } from "@/lib/utils";
import BlueprintGrid from "./blueprint-grid";
import MagneticButton from "./magnet-button";

interface Props {
  numbering?: number;
  /** Destination for the audit CTA. Defaults to the homepage-local anchor. */
  auditHref?: string;
}

export default function FinalCTA({
  numbering = 1,
  auditHref = "#audit",
}: Readonly<Props>) {
  return (
    <BlueprintGrid id="final-cta" className="bg-catalyst py-24 text-white lg:py-32">
      <div className="mx-auto max-w-[1600px] px-6 lg:px-10">
        <div className="grid grid-cols-1 items-center gap-12 lg:grid-cols-2">
          <div>
            <span className="small-caps text-white/70">{`// ${formatNumber(numbering)} — Next Step`}</span>
            <h2 className="mt-6 font-display text-4xl font-black leading-[1.02] lg:text-6xl text-balance">
              Ready to improve
              <br />
              your digital presence?
            </h2>
            <p className="mt-6 max-w-md text-lg text-white/80">
              Tell us where you are and where you want to grow. We&apos;ll reply
              within one business day with a clear, practical next step — no
              pressure, no inflated promises.
            </p>
          </div>
          <div className="flex flex-col gap-4 sm:flex-row lg:justify-end">
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
              href={auditHref}
              variant="outline"
              className="border-white/60 text-white hover:bg-white hover:text-ink dark:hover:text-black"
            >
              Get Free Growth Audit
            </MagneticButton>
          </div>
        </div>
      </div>
    </BlueprintGrid>
  );
}
