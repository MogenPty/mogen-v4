"use client";

import { Star } from "lucide-react";
import BlueprintGrid, { SectionLabel } from "./blueprint-grid";

const QUOTES = [
  {
    quote:
      "Mogen built us an amazing website that brings in new customers every week. Professional, fast, and affordable!",
    name: "Thabo Molefe",
    role: "Molefe Plumbing Services",
  },
  {
    quote:
      "They understood our mission and created a website that perfectly represents our work. Donations have increased significantly.",
    name: "Nomsa Dlamini",
    role: "Community Care NGO",
  },
  {
    quote:
      "The team delivered exactly what we needed — a modern, professional site that converts visitors into leads.",
    name: "Sipho Nkosi",
    role: "InnovateSA Startup",
  },
];

export default function Testimonials() {
  return (
    <BlueprintGrid className="bg-secondary py-24 lg:py-32">
      <div className="mx-auto max-w-[1600px] px-6 lg:px-10">
        <SectionLabel index="// 04 — Trust" title="Client Love" />

        <div className="mb-14 flex flex-col justify-between gap-6 lg:flex-row lg:items-end">
          <h2 className="font-display text-4xl font-black leading-[1.05] text-ink lg:text-6xl text-balance">
            What our
            <br />
            <span className="text-catalyst">clients say.</span>
          </h2>
          <div className="flex items-center gap-3">
            <div className="flex">
              {Array.from({ length: 5 }).map((_, i) => (
                <Star
                  key={i}
                  className="h-5 w-5 fill-catalyst text-catalyst"
                  aria-hidden="true"
                />
              ))}
            </div>
            <span className="small-caps text-muted-foreground">
              4.9 / 5 · 50+ reviews
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
