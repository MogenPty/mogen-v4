import Image from "next/image";
import { PORTFOLIO } from "@/data/portfolio";
import { formatNumber } from "@/lib/utils";
import BlueprintGrid, { SectionLabel } from "./blueprint-grid";
import MagneticButton from "./magnet-button";

interface Props {
  numbering?: number;
}

export default function Portfolio({ numbering = 1 }: Readonly<Props>) {
  return (
    <BlueprintGrid id={"work"} className="bg-bone py-24 lg:py-32">
      <div className="mx-auto max-w-[1600px] px-6 lg:px-10">
        <SectionLabel
          index={`// ${formatNumber(numbering)} — Proof`}
          title="Our Work"
        />

        <div className="mb-14 flex flex-col justify-between gap-6 lg:flex-row lg:items-end">
          <h2 className="font-display text-4xl font-black leading-[1.05] text-ink lg:text-6xl text-balance">
            Selected work
            <br />
            <span className="text-catalyst">and live sites.</span>
          </h2>
          <p className="max-w-md text-lg text-ink/70">
            Selected work and live sites from the Mogen ecosystem — illustrating
            how we structure websites for clarity and discovery.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-px bg-ink/10 md:grid-cols-3">
          {PORTFOLIO.map((p) => (
            <article key={p.name} className="group relative bg-bone">
              <div className="relative aspect-2/1 overflow-hidden bg-ink/5">
                <Image
                  src={p.image}
                  alt={`${p.name} — ${p.desc}`}
                  width={800}
                  height={400}
                  sizes="(max-width: 768px) 100vw, 33vw"
                  className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
                  priority
                />
                <div
                  className="absolute inset-0 bg-ink/0 transition-colors group-hover:bg-ink/20"
                  aria-hidden="true"
                />
                <span className="absolute left-4 top-4 small-caps bg-bone px-3 py-1 text-ink">
                  {p.category}
                </span>
              </div>
              <div className="p-6">
                <h3 className="font-display text-2xl font-black text-ink">
                  {p.url ? (
                    <a
                      href={p.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="hover:text-catalyst"
                    >
                      {p.name}
                    </a>
                  ) : (
                    p.name
                  )}
                </h3>
                <p className="mt-2 text-sm text-ink/70">{p.desc}</p>
                <p className="mt-4 small-caps text-ink/40">
                  Services delivered
                </p>
                <div className="mt-1 flex flex-wrap gap-2">
                  {p.tags.map((t) => (
                    <span
                      key={t}
                      className="small-caps border border-ink/15 px-2 py-1 text-ink/60"
                    >
                      {t}
                    </span>
                  ))}
                </div>
              </div>
            </article>
          ))}
        </div>

        <div className="mt-12">
          <MagneticButton as="a" href="#assessment" variant="outline">
            Start your project →
          </MagneticButton>
        </div>
      </div>
    </BlueprintGrid>
  );
}
