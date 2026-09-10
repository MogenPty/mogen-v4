"use client";

import { useEffect, useState } from "react";
import MagneticButton from "./magnet-button";
import StatPill from "./stat-pill";

const KEYWORDS = [
  "Web Design in Pretoria",
  "Local SEO that Ranks",
  "Brands that Convert",
  "Websites that Sell",
  "Growth on Google",
];

function useTypewriter(words, { type = 90, erase = 45, hold = 1600 } = {}) {
  const [text, setText] = useState("");
  const [i, setI] = useState(0);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    const current = words[i % words.length];
    let t;
    if (!deleting && text === current) {
      t = setTimeout(() => setDeleting(true), hold);
    } else if (deleting && text === "") {
      setDeleting(false);
      setI((v) => v + 1);
    } else {
      t = setTimeout(
        () => {
          setText((prev) =>
            deleting
              ? current.slice(0, prev.length - 1)
              : current.slice(0, prev.length + 1),
          );
        },
        deleting ? erase : type,
      );
    }
    return () => clearTimeout(t);
  }, [text, deleting, i, words, type, erase, hold]);

  return text;
}

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
              Pretoria · Gauteng · ZA
            </span>
          </div>

          <h1 className="font-display text-[13vw] leading-[0.95] font-black tracking-tight text-ink lg:text-[5.2vw]">
            We engineer
            <br />
            <span className="text-catalyst">{typed}</span>
            <span
              className="ml-1 inline-block h-[0.8em] w-[0.08em] translate-y-[0.05em] bg-ink animate-pulse"
              aria-hidden="true"
            />
          </h1>

          <p className="mt-8 max-w-xl text-lg leading-relaxed text-ink/80">
            Mogen builds stunning websites, killer brands and rank-winning SEO
            for local businesses across Pretoria, Maboloka, Soshanguve and
            beyond — turning passive visitors into active partners.
          </p>

          <div className="mt-10 flex flex-wrap items-center gap-4">
            <MagneticButton
              as="a"
              href="#audit"
              variant="catalyst"
              aria-label="Get your free Mogen Growth Audit"
            >
              Get Free Growth Audit
            </MagneticButton>
            <MagneticButton
              as="a"
              href="#work"
              variant="outline"
              aria-label="View our work"
            >
              View Work
            </MagneticButton>
          </div>

          <div className="mt-14 grid grid-cols-2 gap-8 sm:grid-cols-4 border-t border-ink/10 pt-8">
            <StatPill value="50+" label="Happy Clients" />
            <StatPill value="120+" label="Projects Done" />
            <StatPill value="4.9★" label="Avg Rating" />
            <StatPill value="25+" label="Years Experience" />
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

function DriftingMetrics() {
  const items = [
    {
      t: "+38% Organic Traffic",
      top: "18%",
      left: "4%",
      size: "text-2xl",
      speed: 0.04,
    },
    {
      t: "R1.42M Pipeline",
      top: "62%",
      left: "8%",
      size: "text-xl",
      speed: 0.06,
    },
    {
      t: "Core Web Vitals: 98",
      top: "30%",
      right: "5%",
      size: "text-2xl",
      speed: 0.05,
    },
    {
      t: "31% Market Share",
      top: "72%",
      right: "9%",
      size: "text-xl",
      speed: 0.03,
    },
  ];
  const [y, setY] = useState(0);
  useEffect(() => {
    const onScroll = () => setY(window.scrollY);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);
  return (
    <div
      className="pointer-events-none absolute inset-0 z-0 overflow-hidden"
      aria-hidden="true"
    >
      {items.map((it, idx) => (
        <span
          key={idx}
          className={`absolute font-display font-black text-ink/4 ${it.size}`}
          style={{
            top: it.top,
            left: it.left,
            right: it.right,
            transform: `translateY(${y * it.speed}px)`,
          }}
        >
          {it.t}
        </span>
      ))}
    </div>
  );
}
