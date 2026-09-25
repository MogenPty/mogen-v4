import { formatNumber } from "@/lib/utils";
import BlueprintGrid, { SectionLabel } from "./blueprint-grid";

interface Props {
  numbering?: number;
}

export default function WhatMogenDoes({ numbering = 1 }: Readonly<Props>) {
  return (
    <BlueprintGrid id={"what-mogen-does"} className="bg-bone py-24 lg:py-32">
      <div className="mx-auto max-w-[1600px] px-6 lg:px-10">
        <SectionLabel
          index={`// ${formatNumber(numbering)} — About`}
          title="What Mogen Does"
        />
        <div className="grid grid-cols-1 gap-10 lg:grid-cols-[1.1fr_1.9fr] lg:gap-16">
          <div>
            <h2 className="font-display text-4xl font-black leading-[1.05] text-ink lg:text-5xl text-balance">
              Practical digital services for
              <br />
              <span className="text-catalyst">growing businesses.</span>
            </h2>
          </div>
          <div className="space-y-5 text-lg leading-relaxed text-ink/70">
            <p>
              Mogen is a South African digital services business based in
              Maboloka and serving clients across Pretoria, Soshanguve, Gauteng
              and beyond. We help businesses establish and improve their digital
              presence with services that are useful, appropriate to their size,
              and built to last.
            </p>
            <p>
              Websites are at the core of what we do — fast, secure and
              mobile-first sites structured for clarity and discovery. SEO and
              digital marketing help businesses improve their visibility on
              Google and reach the right audience. Business documentation
              supports the operational side, with professional policies,
              procedures, forms and templates that keep work consistent.
            </p>
            <p>
              Our approach is practical. We focus on solving the actual problem
              in front of us, not adding technology for its own sake. Each
              service is offered as a distinct, understandable option so clients
              know what they are paying for, and where specialist input is
              needed we coordinate with trusted external partners.
            </p>
          </div>
        </div>
      </div>
    </BlueprintGrid>
  );
}
