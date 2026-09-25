import { ArrowRight, Clock } from "lucide-react";
import Link from "next/link";
import { POSTS } from "@/data/blog";
import { formatNumber } from "@/lib/utils";
import BlueprintGrid, { SectionLabel } from "./blueprint-grid";
import MagneticButton from "./magnet-button";

interface Props {
  numbering?: number;
}

export default function ArticlesPreview({ numbering = 1 }: Readonly<Props>) {
  // Select 3 factual educational articles — exclude any unsupported claim articles
  // Current data is clean; pick most recent 3
  const preview = POSTS.slice(0, 3);

  return (
    <BlueprintGrid id="articles" className="bg-bone py-24 lg:py-32">
      <div className="mx-auto max-w-[1600px] px-6 lg:px-10">
        <SectionLabel
          index={`// ${formatNumber(numbering)} — Insights`}
          title="Articles & Insights"
        />
        <div className="mb-14 flex flex-col justify-between gap-6 lg:flex-row lg:items-end">
          <h2 className="font-display text-4xl font-black leading-[1.05] text-ink lg:text-6xl text-balance">
            Learn how to
            <br />
            <span className="text-catalyst">grow.</span>
          </h2>
          <p className="max-w-md text-lg text-ink/70">
            Practical educational content on websites, local SEO and digital
            marketing — written for South African businesses that want to
            understand what works.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-px bg-ink/10 md:grid-cols-3">
          {preview.map((p) => (
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
              <span className="mt-6 inline-flex items-center gap-2 text-sm small-caps group-hover:text-catalyst">
                Read article <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
              </span>
            </Link>
          ))}
        </div>

        <div className="mt-12 flex flex-wrap gap-4">
          <MagneticButton as="a" href="/blog" variant="outline">
            View all articles →
          </MagneticButton>
        </div>
      </div>
    </BlueprintGrid>
  );
}
