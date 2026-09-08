"use client";

import { Button } from "@base-ui/react";
import { ArrowRight, Clock } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { POSTS } from "@/data/blog";
import BlueprintGrid from "./blueprint-grid";
import MagneticButton from "./magnet-button";
import PageShell from "./page-shell";

const CATEGORIES = ["All", "Article", "Case Study", "Growth Advice"];

export default function BlogBlock() {
  const [filter, setFilter] = useState("All");
  const featured = POSTS[0];
  const rest = POSTS.slice(1);
  const list =
    filter === "All"
      ? rest
      : POSTS.filter((p) => p.category === filter && p.slug !== featured.slug);

  return (
    <PageShell
      index="// 09 — Insights"
      label="Blog & Insights"
      title={
        <>
          Growth, <span className="text-catalyst">decoded.</span> Posts:{" "}
          {POSTS.length}
        </>
      }
      intro="Industry articles, real case studies and practical growth advice — built for local South African businesses that want to rank, convert and grow."
    >
      {/* Featured */}
      <BlueprintGrid id={"featured_post"} className="bg-bone pb-16">
        <div className="mx-auto max-w-[1600px] px-6 lg:px-10">
          <Link
            href={`/blog/${featured.slug}`}
            className="group grid grid-cols-1 gap-8 border border-ink/10 bg-bone p-6 transition-colors hover:bg-ink hover:text-bone lg:grid-cols-2 lg:p-10"
          >
            <div className="flex flex-col justify-between">
              <div>
                <span className="small-caps text-catalyst">
                  {featured.category} · Featured
                </span>
                <h2 className="mt-4 font-display text-3xl font-black leading-tight lg:text-5xl text-balance">
                  {featured.title}
                </h2>
                <p className="mt-4 max-w-md text-sm opacity-80">
                  {featured.excerpt}
                </p>
              </div>
              <div className="mt-8 flex items-center gap-4 text-sm opacity-70">
                <span>{featured.author}</span>
                <span>·</span>
                <span>{featured.date}</span>
                <span>·</span>
                <span className="flex items-center gap-1">
                  <Clock className="h-3 w-3" /> {featured.readTime}
                </span>
              </div>
            </div>
            <div className="flex items-end justify-end">
              <span className="small-caps flex items-center gap-2 text-catalyst">
                Read article{" "}
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
              </span>
            </div>
          </Link>
        </div>
      </BlueprintGrid>

      {/* Filter + grid */}
      <BlueprintGrid className="bg-bone pb-24">
        <div className="mx-auto max-w-[1600px] px-6 lg:px-10">
          <div className="mb-10 flex flex-wrap gap-2">
            {CATEGORIES.map((c) => (
              <Button
                key={c}
                onClick={() => setFilter(c)}
                className={
                  "small-caps border px-4 py-2 transition-colors " +
                  (filter === c
                    ? "border-ink bg-ink text-bone"
                    : "border-ink/15 text-ink/70 hover:border-ink hover:text-ink")
                }
              >
                {c}
              </Button>
            ))}
          </div>

          <div className="grid grid-cols-1 gap-px bg-ink/10 md:grid-cols-2 lg:grid-cols-3">
            {list.map((p) => (
              <Link
                key={p.slug}
                href={`/blog/${p.slug}`}
                className="group flex flex-col bg-bone p-8 transition-colors hover:bg-ink hover:text-bone"
              >
                <span className="small-caps text-catalyst">{p.category}</span>
                <h3 className="mt-4 font-display text-xl font-black leading-tight">
                  {p.title}
                </h3>
                <p className="mt-3 flex-1 text-sm opacity-80">{p.excerpt}</p>
                <div className="mt-6 flex items-center justify-between text-xs opacity-60">
                  <span>{p.date}</span>
                  <span className="flex items-center gap-1">
                    <Clock className="h-3 w-3" /> {p.readTime}
                  </span>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </BlueprintGrid>

      {/* CTA */}
      <BlueprintGrid className="bg-catalyst py-20 text-white">
        <div className="mx-auto flex max-w-[1600px] flex-col items-start justify-between gap-6 px-6 lg:flex-row lg:items-center lg:px-10">
          <h2 className="font-display text-3xl font-black lg:text-5xl text-balance">
            Want this growth working for you?
          </h2>
          <div className="flex flex-col gap-3 sm:flex-row">
            <MagneticButton
              as="a"
              href="/#audit"
              variant="solid"
              className="bg-ink text-bone hover:bg-bone hover:text-ink"
            >
              Get Free Audit
            </MagneticButton>
            <MagneticButton
              as="a"
              href="/contact"
              variant="outline"
              className="border-white/60 text-white hover:bg-white hover:text-ink"
            >
              Talk to Us
            </MagneticButton>
          </div>
        </div>
      </BlueprintGrid>
    </PageShell>
  );
}
