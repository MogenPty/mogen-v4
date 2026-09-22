import { Check, Code2, Handshake, Layers, MapPin } from "lucide-react";
import BlueprintGrid, { SectionLabel } from "./blueprint-grid";

const REASONS = [
  {
    icon: Check,
    title: "Practical solutions",
    desc: "We focus on the actual business problem — not unnecessary features or technology. Solutions are scoped to what the client genuinely needs.",
  },
  {
    icon: Code2,
    title: "Technical experience",
    desc: "Mogen has substantial software development and technical experience, applied to fast, secure, well-structured websites and reliable delivery.",
  },
  {
    icon: MapPin,
    title: "Local understanding",
    desc: "We are South African and understand how small and growing businesses here search, decide and buy — from Maboloka and Pretoria to wider Gauteng.",
  },
  {
    icon: Layers,
    title: "Clear service options",
    desc: "Each service — Web Development, SEO, Digital Marketing and Business Documentation — is a distinct offering with clear scope and deliverables.",
  },
  {
    icon: Handshake,
    title: "Flexible specialist support",
    desc: "Where a project needs specialist capability outside our core work, we coordinate with trusted external specialists rather than claiming everything is in-house.",
  },
];

export default function WhyMogen() {
  return (
    <BlueprintGrid id="why-mogen" className="bg-secondary py-24 lg:py-32">
      <div className="mx-auto max-w-[1600px] px-6 lg:px-10">
        <SectionLabel index="// 03 — Why Mogen" title="Why Consider Mogen" />
        <div className="mb-14 max-w-2xl">
          <h2 className="font-display text-4xl font-black leading-[1.05] text-ink lg:text-6xl text-balance">
            A straightforward
            <br />
            <span className="text-catalyst">way to work.</span>
          </h2>
          <p className="mt-6 text-lg text-ink/70">
            No inflated claims, no invented awards. A small, focused team that
            builds what is useful and coordinates specialist help when it is
            needed.
          </p>
        </div>
        <div className="grid grid-cols-1 gap-px bg-ink/10 md:grid-cols-2 lg:grid-cols-3">
          {REASONS.map((r) => {
            const Icon = r.icon;
            return (
              <div key={r.title} className="bg-bone p-8">
                <Icon className="h-8 w-8 text-catalyst" strokeWidth={1.5} aria-hidden="true" />
                <h3 className="mt-6 font-display text-xl font-black text-ink">{r.title}</h3>
                <p className="mt-3 text-sm leading-relaxed text-ink/70">{r.desc}</p>
              </div>
            );
          })}
          <div className="flex flex-col justify-center bg-ink p-8 text-bone">
            <h3 className="font-display text-xl font-black">Not a large agency. Intentionally.</h3>
            <p className="mt-3 text-sm leading-relaxed text-bone/70">
              We do not present Mogen as a large internal team. We are lean, transparent about scope, and honest about where external specialists add value.
            </p>
          </div>
        </div>
      </div>
    </BlueprintGrid>
  );
}
