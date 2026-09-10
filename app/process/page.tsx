import { ArrowRight, Code2, PenTool, Search, TrendingUp } from "lucide-react";
import BlueprintGrid from "@/components/mogen/blueprint-grid";
import MagneticButton from "@/components/mogen/magnet-button";
import PageShell from "@/components/mogen/page-shell";

const PHASES = [
  {
    icon: Search,
    no: "01",
    title: "Discover",
    desc: "We start with your Growth Audit and a deep dive into your market, competitors and customers. We define the goals that matter — bookings, enquiries, revenue — and the metrics we'll measure.",
    steps: ["Growth Audit", "Competitor research", "Goal setting"],
  },
  {
    icon: PenTool,
    no: "02",
    title: "Architect",
    desc: "We design the blueprint: site structure, brand system, content strategy and the SEO framework that will drive rankings. Every decision maps back to your growth goals.",
    steps: [
      "Information architecture",
      "Brand & design system",
      "Content & SEO strategy",
    ],
  },
  {
    icon: Code2,
    no: "03",
    title: "Build",
    desc: "We engineer a fast, secure, mobile-first site that passes Core Web Vitals by default. Conversion paths are built in, not bolted on. You review and we refine until it's right.",
    steps: ["Development", "Conversion UX", "QA & launch"],
  },
  {
    icon: TrendingUp,
    no: "04",
    title: "Grow",
    desc: "Launch is the starting line. We optimise, publish content, build local authority and report on results — compounding your growth month after month.",
    steps: [
      "Local SEO & content",
      "Authority building",
      "Reporting & optimisation",
    ],
  },
];

export default function Process() {
  return (
    <PageShell
      index="// 14 — Process"
      label="Agency Process"
      title={
        <>
          A framework that{" "}
          <span className="text-catalyst">compounds growth.</span>
        </>
      }
      intro="The step-by-step process Mogen uses to take local businesses from invisible to in-demand."
    >
      <BlueprintGrid className="bg-bone pb-24">
        <div className="mx-auto max-w-[1600px] px-6 lg:px-10">
          <div className="grid grid-cols-1 gap-px bg-ink/10 lg:grid-cols-2">
            {PHASES.map((p) => {
              const Icon = p.icon;
              return (
                <div key={p.no} className="bg-bone p-8 lg:p-10">
                  <div className="flex items-center justify-between">
                    <Icon
                      className="h-8 w-8 text-catalyst"
                      strokeWidth={1.5}
                      aria-hidden="true"
                    />
                    <span className="font-display text-4xl font-black text-ink/15">
                      {p.no}
                    </span>
                  </div>
                  <h2 className="mt-6 font-display text-2xl font-black text-ink">
                    {p.title}
                  </h2>
                  <p className="mt-3 text-ink/70">{p.desc}</p>
                  <ul className="mt-6 space-y-2">
                    {p.steps.map((s) => (
                      <li
                        key={s}
                        className="flex items-center gap-2 text-sm text-ink/80"
                      >
                        <span
                          className="h-1 w-1 bg-catalyst"
                          aria-hidden="true"
                        />
                        {s}
                      </li>
                    ))}
                  </ul>
                </div>
              );
            })}
          </div>
        </div>
      </BlueprintGrid>

      <BlueprintGrid className="bg-ink py-20 text-bone">
        <div className="mx-auto flex max-w-[1600px] flex-col items-start justify-between gap-6 px-6 lg:flex-row lg:items-center lg:px-10">
          <h2 className="font-display text-3xl font-black lg:text-4xl text-balance">
            See it work for your business.
          </h2>
          <div className="flex flex-col gap-3 sm:flex-row">
            <MagneticButton as="a" href="/#audit" variant="catalyst">
              Start with a Free Audit <ArrowRight className="h-4 w-4" />
            </MagneticButton>
            <MagneticButton
              as="a"
              href="/success-stories"
              variant="outline"
              className="border-bone/40 text-bone hover:bg-bone hover:text-ink"
            >
              View Success Stories
            </MagneticButton>
          </div>
        </div>
      </BlueprintGrid>
    </PageShell>
  );
}
