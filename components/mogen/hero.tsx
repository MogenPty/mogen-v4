"use client";

import { useTypewriter } from "@/hooks/use-typewriter";
import DriftingMetrics from "./drifting-metrics";
import MagneticButton from "./magnet-button";

const KEYWORDS = [
  "Web Development",
  "SEO",
  "Digital Marketing",
  "Business Documentation",
];

export default function Hero() {
  const typed = useTypewriter(KEYWORDS);

  return (
    <section
      id={"top"}
      className="relative min-h-screen w-full overflow-hidden bg-bone pt-24"
    >
      {/* parallax drifting metric numbers */}
      <DriftingMetrics />

      <div className="relative z-10 mx-auto flex min-h-[calc(100vh-6rem)] max-w-[1600px] flex-col justify-center px-6 py-12 lg:px-12 lg:py-20">
        <div className="mx-auto w-full max-w-4xl">
          <div className="mb-6 flex items-center gap-3">
            <span
              className="h-2 w-2 bg-catalyst animate-pulse"
              aria-hidden="true"
            />
            <span className="small-caps text-muted-foreground">
              Maboloka · South Africa · Digital Services
            </span>
          </div>

          <h1 className="font-display text-[11vw] leading-[0.95] font-black tracking-tight text-ink lg:text-[5vw]">
            Digital services
            <br />
            for businesses
            <br />
            <span className="text-catalyst">{typed}</span>
            <span
              className="ml-1 inline-block h-[0.8em] w-[0.08em] translate-y-[0.05em] bg-ink animate-pulse"
              aria-hidden="true"
            />
            <span className="block text-[6vw] lg:text-[2.2vw] font-black text-ink/90 mt-2">
              that are ready to grow.
            </span>
          </h1>

          <p className="mt-8 max-w-xl text-lg leading-relaxed text-ink/80">
            Mogen is a South African digital services business based in
            Maboloka. We help businesses with practical services — websites,
            online visibility, digital marketing and business documentation —
            appropriate to their needs.
          </p>

          <div className="mt-10 flex flex-wrap items-center gap-4">
            <MagneticButton
              as="a"
              href="#services"
              variant="catalyst"
              aria-label="Explore Mogen services"
            >
              Explore Services
            </MagneticButton>
            <MagneticButton
              as="a"
              href="#audit"
              variant="outline"
              aria-label="Get your free Mogen Growth Audit"
            >
              Free Growth Audit
            </MagneticButton>
          </div>
        </div>
      </div>

      <div className="relative z-10 flex justify-center pb-10">
        <a
          href="#services"
          className="small-caps text-muted-foreground hover:text-catalyst transition-colors"
          aria-label="Scroll to services"
        >
          Scroll to deconstruct ↓
        </a>
      </div>
    </section>
  );
}
