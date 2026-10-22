import Image from "next/image";
import { formatNumber } from "@/lib/utils";
// import * as image2 from "@/assets/545dd9c3f_generated_e75836b5.jpg";
// import * as image3 from "@/assets/23760dfef_generated_d82b3c44.jpg";
// import * as image1 from "@/assets/d15ea8711_generated_a33e55cb.jpg";
import BlueprintGrid, { SectionLabel } from "./blueprint-grid";
import MagneticButton from "./magnet-button";

// export const imageMap = {
//   image1,
//   image2,
//   image3,
// } as const;

// export type ImageKey = keyof typeof imageMap;

const PROJECTS = [
  {
    name: "Mogen",
    category: "Live site · Digital Services",
    desc: "Mogen's own site — services, SEO and local discovery for South African businesses.",
    url: "https://www.mogen.co.za",
    image: "/images/mogen-01-home.png",
    tags: ["Web Development", "SEO", "Local Discovery"],
  },
  {
    name: "Masoko Psychology",
    category: "Live site · Psychology Practice",
    desc: "Practice website presenting services and making it easy for clients to reach out.",
    url: "https://www.masokopsychology.co.za",
    image: "/images/masoko-01-home.png",
    tags: ["Web Design", "Service Pages", "Enquiry Paths"],
  },
  {
    name: "Down2Earth Health & Beauty Spa",
    category: "Live site · Health & Beauty Spa",
    desc: "Spa website showcasing treatments and guiding visitors to book.",
    url: "https://www.d2espa.co.za",
    image: "/images/d2es-01-home.png",
    tags: ["Web Design", "Bookings", "Local SEO"],
  },
];

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
            Selected work and live sites from the Mogen ecosystem —
            illustrating how we structure websites for clarity and discovery.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-px bg-ink/10 md:grid-cols-3">
          {PROJECTS.map((p) => (
            <article key={p.name} className="group relative bg-bone">
              <div className="relative aspect-[2/1] overflow-hidden bg-ink/5">
                <Image
                  src={p.image}
                  alt={`${p.name} — ${p.desc}`}
                  className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
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
                  {p.url ? (
                    <a href={p.url} target="_blank" rel="noopener noreferrer" className="hover:text-catalyst">{p.name}</a>
                  ) : (
                    p.name
                  )}
                </h3>
                <p className="mt-2 text-sm text-ink/70">{p.desc}</p>
                <p className="mt-4 small-caps text-ink/40">Services delivered</p>
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
