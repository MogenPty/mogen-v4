import Image from "next/image";
import BlueprintGrid, { SectionLabel } from "./blueprint-grid";
import MagneticButton from "./magnet-button";
import d15ea8711_generated_a33e55cb from "@/assets/d15ea8711_generated_a33e55cb.jpg";
import 545dd9c3f_generated_e75836b5 from "@/assets/545dd9c3f_generated_e75836b5.jpg";
import 23760dfef_generated_d82b3c44 from "@/assets/23760dfef_generated_d82b3c44.jpg";

export const imageMap = {
  d15ea8711_generated_a33e55cb,
  545dd9c3f_generated_e75836b5,
23760dfef_generated_d82b3c44
} as const;

export type ImageKey = keyof typeof imageMap;

const PROJECTS = [
  {
    name: "Molefe Plumbing",
    category: "Local Business",
    desc: "Modern website with WhatsApp booking and customer testimonials.",
    img: "https://media.base44.com/images/public/6a9593f32823a9ba2917bec0/d15ea8711_generated_a33e55cb.jpg",
    image: "d15ea8711_generated_a33e55cb",
    tags: ["Web Design", "WhatsApp Booking", "Local SEO"],
  },
  {
    name: "Lighters of the World",
    category: "NGO",
    desc: "Warm, inviting site with donation system and volunteer portal.",
    img: "https://media.base44.com/images/public/6a9593f32823a9ba2917bec0/545dd9c3f_generated_e75836b5.jpg",
    image: "545dd9c3f_generated_e75836b5",
    tags: ["Web Development", "Donations", "Brand Identity"],
  },
  {
    name: "TechStart SA",
    category: "Startup",
    desc: "Bold landing page with lead capture and analytics integration.",
    img: "https://media.base44.com/images/public/6a9593f32823a9ba2917bec0/23760dfef_generated_d82b3c44.jpg",
    image: "23760dfef_generated_d82b3c44",
    tags: ["Landing Page", "Lead Capture", "Analytics"],
  },
];

export default function Portfolio() {
  return (
    <BlueprintGrid id={"work"} className="bg-bone py-24 lg:py-32">
      <div className="mx-auto max-w-[1600px] px-6 lg:px-10">
        <SectionLabel index="// 03 — Proof" title="Our Work" />

        <div className="mb-14 flex flex-col justify-between gap-6 lg:flex-row lg:items-end">
          <h2 className="font-display text-4xl font-black leading-[1.05] text-ink lg:text-6xl text-balance">
            Projects that
            <br />
            <span className="text-catalyst">make impact.</span>
          </h2>
          <p className="max-w-md text-lg text-ink/70">
            Real results for real businesses. See how we&apos;ve helped local
            companies grow online.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-px bg-ink/10 md:grid-cols-3">
          {PROJECTS.map((p) => (
            <article key={p.name} className="group relative bg-bone">
              <div className="relative aspect-4/3 overflow-hidden bg-ink/5">
                <Image
                  src={imageMap[p.image as ImageKey]}
                  alt={`${p.name} — ${p.desc}`}
                  className="h-full w-full transition-transform duration-700 group-hover:scale-105"
                  fill={true}
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
                  {p.name}
                </h3>
                <p className="mt-2 text-sm text-ink/70">{p.desc}</p>
                <div className="mt-4 flex flex-wrap gap-2">
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
          <MagneticButton as="a" href="#audit" variant="outline">
            Start your project →
          </MagneticButton>
        </div>
      </div>
    </BlueprintGrid>
  );
}
