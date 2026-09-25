"use client";

import { formatNumber } from "@/lib/utils";
import BlueprintGrid, { SectionLabel } from "./blueprint-grid";

// Testimonials removed — verified client testimonials not currently available.
// Component retained for potential future use with verified content.
const QUOTES: Array<{ quote: string; name: string; role: string }> = [];

interface Props {
  numbering?: number;
}

export default function Testimonials({ numbering = 1 }: Readonly<Props>) {
  return (
    <BlueprintGrid className="bg-secondary py-24 lg:py-32">
      <div className="mx-auto max-w-[1600px] px-6 lg:px-10">
        <SectionLabel
          index={`// ${formatNumber(numbering)} — Trust`}
          title="Client Love"
        />

        <div className="mb-14 flex flex-col justify-between gap-6 lg:flex-row lg:items-end">
          <h2 className="font-display text-4xl font-black leading-[1.05] text-ink lg:text-6xl text-balance">
            What our
            <br />
            <span className="text-catalyst">clients say.</span>
          </h2>
          <div className="flex items-center gap-3">
            <span className="small-caps text-muted-foreground">
              Verified client feedback will appear here when available
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-px bg-ink/10 md:grid-cols-3">
          {QUOTES.map((q) => (
            <figure
              key={q.name}
              className="flex flex-col justify-between bg-bone p-8"
            >
              <blockquote className="text-lg leading-relaxed text-ink/80">
                “{q.quote}”
              </blockquote>
              <figcaption className="mt-8 border-t border-ink/10 pt-4">
                <div className="font-display text-lg font-black text-ink">
                  {q.name}
                </div>
                <div className="small-caps text-muted-foreground">{q.role}</div>
              </figcaption>
            </figure>
          ))}
        </div>
      </div>
    </BlueprintGrid>
  );
}
