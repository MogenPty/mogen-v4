import { ArrowRight } from "lucide-react";
import BlueprintGrid from "@/components/mogen/blueprint-grid";
import MagneticButton from "@/components/mogen/magnet-button";
import PageShell from "@/components/mogen/page-shell";

const STORIES = [
  {
    client: "Local hospitality businesses",
    industry: "Hospitality",
    summary:
      "How we structure restaurant and hospitality sites for clarity and discovery — menu presentation, booking paths, and local relevance.",
    focus: [
      { label: "Focus", value: "Menu & booking structure" },
      { label: "Foundation", value: "Local discovery" },
      { label: "Support", value: "GBP & citations" },
    ],
  },
  {
    client: "Clinics and professional services",
    industry: "Healthcare",
    summary:
      "How we approach clinic and service sites — clear service information, simple enquiry paths, and content that answers patient questions.",
    focus: [
      { label: "Focus", value: "Service clarity" },
      { label: "Foundation", value: "Technical health" },
      { label: "Support", value: "Local content" },
    ],
  },
  {
    client: "Retail and e-commerce",
    industry: "E-commerce",
    summary:
      "How we structure retail and product sites — navigation, product presentation, and checkout paths designed for confidence.",
    focus: [
      { label: "Focus", value: "Store structure" },
      { label: "Foundation", value: "Speed & UX" },
      { label: "Support", value: "Content & search" },
    ],
  },
];

export default function SuccessStories() {
  return (
    <PageShell
      index="// 15 — Selected Work"
      label="Selected Work"
      title={
        <>
          Selected work, <span className="text-catalyst">practical approach.</span>
        </>
      }
      intro="Examples of how we approach different business types — focused on structure, local relevance and clear enquiry paths."
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
                  </div>
                  <div className="grid grid-cols-3 gap-px bg-ink/10">
                    {s.focus.map((m) => (
                      <div key={m.label} className="bg-bone p-5 text-center">
                        <div className="font-display text-lg font-black text-ink">
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
            Want this structure for your business?
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
