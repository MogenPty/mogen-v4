"use client";

import {
  AlertTriangle,
  ArrowRight,
  FileText,
  Gauge,
  Link2,
  MapPin,
  ShieldCheck,
  TrendingUp,
} from "lucide-react";
import { useState } from "react";
import BlueprintGrid from "@/components/mogen/blueprint-grid";
import MagneticButton from "@/components/mogen/magnet-button";
import PageShell from "@/components/mogen/page-shell";

const clamp = (n: number) => Math.max(5, Math.min(98, Math.round(n)));

export default function GrowthAuditResults() {
  const [data] = useStateSafe();

  if (!data) {
    return (
      <PageShell
        index="// 11 — Audit Results"
        label="Growth Audit Results"
        title={
          <>
            No audit <span className="text-catalyst">to show.</span>
          </>
        }
        intro="You haven't run a Growth Audit yet. Take two minutes to scan your site and unlock your personalised blueprint."
      >
        <BlueprintGrid className="bg-bone pb-24">
          <div className="mx-auto max-w-[1600px] px-6 lg:px-10">
            <MagneticButton as="a" href="/#audit" variant="catalyst">
              Run Free Growth Audit <ArrowRight className="h-4 w-4" />
            </MagneticButton>
          </div>
        </BlueprintGrid>
      </PageShell>
    );
  }

  const { url, score, name } = data;
  const band =
    score < 45
      ? "Critical headroom"
      : score < 53
        ? "Falling behind"
        : "Emerging";
  const categories = [
    {
      icon: Gauge,
      name: "Technical SEO",
      score: clamp(score + 9),
      note: "Indexation, crawl budget and site health",
    },
    {
      icon: TrendingUp,
      name: "Core Web Vitals",
      score: clamp(score - 3),
      note: "LCP, INP and CLS speed signals",
    },
    {
      icon: MapPin,
      name: "Local SEO",
      score: clamp(score + 14),
      note: "Google Business Profile and map pack",
    },
    {
      icon: AlertTriangle,
      name: "Conversions",
      score: clamp(score - 8),
      note: "Lead capture and conversion paths",
    },
  ];
  const actions = [
    {
      priority: "High",
      icon: Link2,
      title: "Fix indexation & crawl budget",
      desc: "Resolve blocked resources and ensure every key page is crawlable and indexed.",
    },
    {
      priority: "High",
      icon: Gauge,
      title: "Improve Core Web Vitals",
      desc: "Compress images to WebP, preload the hero, and defer non-critical scripts.",
    },
    {
      priority: "High",
      icon: MapPin,
      title: "Optimise Google Business Profile",
      desc: "Complete every field, add fresh photos monthly and start a review campaign.",
    },
    {
      priority: "Medium",
      icon: AlertTriangle,
      title: "Strengthen conversion paths",
      desc: "Move lead forms above the fold and reduce fields to name and email.",
    },
    {
      priority: "Medium",
      icon: FileText,
      title: "Build a local content cluster",
      desc: "Publish pages for each suburb and service you offer to capture local intent.",
    },
    {
      priority: "Medium",
      icon: Link2,
      title: "Earn local citations & backlinks",
      desc: "Clean up NAP data across directories and earn links from local sources.",
    },
  ];

  return (
    <PageShell
      index="// 11 — Audit Results"
      label="Your Growth Audit Results"
      title={
        <>
          Your growth <span className="text-catalyst">blueprint.</span>
        </>
      }
      intro={`Personalised results for ${url}. Based on the Mogen 37-step framework.`}
    >
      {/* Score */}
      <BlueprintGrid className="bg-bone pb-16">
        <div className="mx-auto max-w-[1600px] px-6 lg:px-10">
          <div className="grid grid-cols-1 gap-px bg-ink/10 lg:grid-cols-3">
            <div className="bg-bone p-8 lg:p-10">
              <span className="small-caps text-ink/50">Growth Score</span>
              <div className="mt-4 flex items-end gap-3">
                <span className="font-display text-7xl font-black text-catalyst">
                  {score}
                </span>
                <span className="mb-3 text-ink/50">/ 100</span>
              </div>
              <div className="mt-4 h-2 w-full bg-ink/10">
                <div
                  className="h-full bg-catalyst"
                  style={{ width: `${score}%` }}
                />
              </div>
              <p className="mt-4 small-caps text-ink/60">{band}</p>
            </div>
            <div className="bg-bone p-8 lg:p-10 lg:col-span-2">
              <span className="small-caps text-ink/50">Summary</span>
              <p className="mt-4 text-lg text-ink/80">
                Hi{name ? `, ${name.split(" ")[0]}` : ""} — your site scored{" "}
                <strong className="text-ink">{score}/100</strong>. That means
                real, addressable growth headroom. The good news: every issue
                below is fixable, and the priorities are ranked by impact.
                Follow this blueprint and you&apos;ll climb the rankings and
                convert more of the traffic you already get.
              </p>
            </div>
          </div>
        </div>
      </BlueprintGrid>

      {/* Category breakdown */}
      <BlueprintGrid className="bg-bone pb-16">
        <div className="mx-auto max-w-[1600px] px-6 lg:px-10">
          <h2 className="mb-8 font-display text-2xl font-black text-ink">
            Score breakdown
          </h2>
          <div className="grid grid-cols-1 gap-px bg-ink/10 md:grid-cols-2 lg:grid-cols-4">
            {categories.map((c) => {
              const Icon = c.icon;
              return (
                <div key={c.name} className="bg-bone p-6">
                  <Icon
                    className="h-6 w-6 text-catalyst"
                    strokeWidth={1.5}
                    aria-hidden="true"
                  />
                  <h3 className="mt-4 font-display text-lg font-black text-ink">
                    {c.name}
                  </h3>
                  <div className="mt-3 flex items-end gap-2">
                    <span className="font-display text-3xl font-black text-ink">
                      {c.score}
                    </span>
                    <span className="mb-1 text-sm text-ink/50">/ 100</span>
                  </div>
                  <div className="mt-2 h-1.5 w-full bg-ink/10">
                    <div
                      className="h-full bg-catalyst"
                      style={{ width: `${c.score}%` }}
                    />
                  </div>
                  <p className="mt-3 text-xs text-ink/60">{c.note}</p>
                </div>
              );
            })}
          </div>
        </div>
      </BlueprintGrid>

      {/* Prioritised actions */}
      <BlueprintGrid className="bg-bone pb-24">
        <div className="mx-auto max-w-[1600px] px-6 lg:px-10">
          <h2 className="mb-8 font-display text-2xl font-black text-ink">
            Prioritised action plan
          </h2>
          <div className="grid grid-cols-1 gap-px bg-ink/10 lg:grid-cols-2">
            {actions.map((a, i) => {
              const Icon = a.icon;
              return (
                <div key={a.title} className="flex gap-4 bg-bone p-6">
                  <span className="font-display text-2xl font-black text-ink/20">
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <div>
                    <div className="flex items-center gap-2">
                      <Icon
                        className="h-4 w-4 text-catalyst"
                        strokeWidth={1.5}
                        aria-hidden="true"
                      />
                      <span
                        className={
                          "small-caps " +
                          (a.priority === "High"
                            ? "text-catalyst"
                            : "text-ink/50")
                        }
                      >
                        {a.priority} priority
                      </span>
                    </div>
                    <h3 className="mt-2 font-display text-lg font-black text-ink">
                      {a.title}
                    </h3>
                    <p className="mt-1 text-sm text-ink/70">{a.desc}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </BlueprintGrid>

      {/* CTA */}
      <BlueprintGrid className="bg-ink py-20 text-bone">
        <div className="mx-auto flex max-w-[1600px] flex-col items-start justify-between gap-6 px-6 lg:flex-row lg:items-center lg:px-10">
          <div>
            <ShieldCheck
              className="h-10 w-10 text-catalyst"
              aria-hidden="true"
            />
            <h2 className="mt-4 font-display text-3xl font-black lg:text-4xl text-balance">
              Want us to execute this blueprint for you?
            </h2>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row">
            <MagneticButton as="a" href="/contact" variant="catalyst">
              Book a Strategy Call <ArrowRight className="h-4 w-4" />
            </MagneticButton>
            <MagneticButton
              as="a"
              href="/#pricing"
              variant="outline"
              className="border-bone/40 text-bone hover:bg-bone hover:text-ink"
            >
              View Packages
            </MagneticButton>
          </div>
        </div>
      </BlueprintGrid>
    </PageShell>
  );
}

function useStateSafe() {
  const [data] = useState(() => {
    try {
      return JSON.parse(sessionStorage.getItem("mogen_audit") || "null");
    } catch {
      return null;
    }
  });
  return [data];
}
