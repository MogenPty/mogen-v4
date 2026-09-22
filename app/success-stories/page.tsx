import { ArrowRight, Quote } from "lucide-react";
import BlueprintGrid from "@/components/mogen/blueprint-grid";
import MagneticButton from "@/components/mogen/magnet-button";
import PageShell from "@/components/mogen/page-shell";

const STORIES = [
  {
    client: "Maboloka Family Restaurant",
    industry: "Hospitality",
    summary:
      "A new mobile-first site and local SEO took a hidden restaurant to fully booked weekends.",
    quote: "We used to wait for customers. Now they find us.",
    metrics: [
      { label: "Organic traffic", value: "+180%" },
      { label: "Weekend bookings", value: "3×" },
      { label: "Weekday bookings", value: "2×" },
    ],
  },
  {
    client: "Soshanguve Dental Clinic",
    industry: "Healthcare",
    summary:
      "From page three of Google to the map pack for high-intent local searches in four months.",
    quote: "We finally show up where patients are looking.",
    metrics: [
      { label: "Map pack rank", value: "#1" },
      { label: "Online bookings", value: "+160%" },
      { label: "Audit score", value: "41 → 86" },
    ],
  },
  {
    client: "Pretoria Retail Brand",
    industry: "E-commerce",
    summary:
      "A rebuilt store, faster checkout and a content cluster lifted online sales and repeat visits.",
    quote: "Our online sales finally match our reputation.",
    metrics: [
      { label: "Online sales", value: "+95%" },
      { label: "Conversion rate", value: "+2.4×" },
      { label: "Repeat visits", value: "+40%" },
    ],
  },
];

export default function SuccessStories() {
  return (
    <PageShell
      index="// 15 — Success Stories"
      label="Success Stories"
      title={
        <>
          Real businesses, <span className="text-catalyst">real growth.</span>
        </>
      }
      intro="Detailed client success stories with the before-and-after growth metrics that matter."
    >
      <BlueprintGrid className="bg-bone pb-24">
        <div className="mx-auto max-w-[1600px] px-6 lg:px-10">
          <div className="space-y-px bg-ink/10">
            {STORIES.map((s) => (
              <article key={s.client} className="bg-bone p-8 lg:p-12">
                <div className="grid grid-cols-1 gap-10 lg:grid-cols-[1.4fr_1fr] lg:gap-16">
                  <div>
                    <span className="small-caps text-catalyst">
                      {s.industry}
                    </span>
                    <h2 className="mt-4 font-display text-3xl font-black leading-tight text-ink lg:text-4xl text-balance">
                      {s.client}
                    </h2>
                    <p className="mt-4 text-lg text-ink/70">{s.summary}</p>
                    <blockquote className="mt-6 flex gap-3 border-l-2 border-catalyst pl-5">
                      <Quote
                        className="h-5 w-5 shrink-0 text-catalyst"
                        aria-hidden="true"
                      />
                      <span className="font-display text-xl font-bold text-ink">
                        {s.quote}
                      </span>
                    </blockquote>
                  </div>
                  <div className="grid grid-cols-3 gap-px bg-ink/10">
                    {s.metrics.map((m) => (
                      <div key={m.label} className="bg-bone p-5 text-center">
                        <div className="font-display text-3xl font-black text-catalyst">
                          {m.value}
                        </div>
                        <div className="mt-2 small-caps text-ink/60">
                          {m.label}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </article>
            ))}
          </div>
        </div>
      </BlueprintGrid>

      <BlueprintGrid className="bg-catalyst py-20 text-white">
        <div className="mx-auto flex max-w-[1600px] flex-col items-start justify-between gap-6 px-6 lg:flex-row lg:items-center lg:px-10">
          <h2 className="font-display text-3xl font-black lg:text-4xl text-balance">
            Your story could be next.
          </h2>
          <MagneticButton
            as="a"
            href="/#audit"
            variant="solid"
            className="bg-ink text-bone hover:bg-bone hover:text-ink"
          >
            Get Free Audit <ArrowRight className="h-4 w-4" />
          </MagneticButton>
        </div>
      </BlueprintGrid>
    </PageShell>
  );
}
