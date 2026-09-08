import BlueprintGrid from "./blueprint-grid";
import MagneticButton from "./magnet-button";

export default function CallToAction() {
  return (
    <BlueprintGrid className="bg-catalyst py-24 text-white lg:py-32">
      <div className="mx-auto max-w-[1600px] px-6 lg:px-10">
        <div className="grid grid-cols-1 items-center gap-12 lg:grid-cols-2">
          <div>
            <span className="small-caps text-white/70">
              {"// 07 — Conversion"}
            </span>
            <h2 className="mt-6 font-display text-4xl font-black leading-[1.02] lg:text-7xl text-balance">
              Ready to go
              <br />
              digital?
            </h2>
            <p className="mt-6 max-w-md text-lg text-white/80">
              Join 50+ local businesses who&apos;ve transformed their online
              presence with Mogen. Start with a free Growth Audit — no
              obligation, just a blueprint to grow.
            </p>
          </div>
          <div className="flex flex-col gap-4 sm:flex-row lg:justify-end">
            <MagneticButton
              as="a"
              href="#audit"
              variant="solid"
              className="bg-ink text-bone hover:bg-bone hover:text-ink"
            >
              Start Your Project
            </MagneticButton>
            <MagneticButton
              as="a"
              href="#pricing"
              variant="outline"
              className="border-white/60 text-white hover:bg-white hover:text-ink"
            >
              View Packages
            </MagneticButton>
          </div>
        </div>
      </div>
    </BlueprintGrid>
  );
}
