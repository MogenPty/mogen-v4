"use client";

import {
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  FileText,
  Gauge,
  Link2,
  MapPin,
  MinusCircle,
  ShieldCheck,
  TrendingUp,
  XCircle,
} from "lucide-react";
import { useState } from "react";
import BlueprintGrid from "@/components/mogen/blueprint-grid";
import { buildEnquiryHref } from "@/lib/enquiry/enquiry";
import { formatNumber } from "@/lib/utils";
import type { QuadrantId } from "@/lib/audit/types";
import { QUADRANT_LABELS } from "@/lib/audit/types";
import MagneticButton from "@/components/mogen/magnet-button";
import PageShell from "@/components/mogen/page-shell";

interface StoredAudit {
  url: string;
  name?: string;
  email?: string;
  reportEmailed?: boolean;
  [key: string]: unknown;
}

interface Props {
  numbering?: number;
}

const QUADRANT_ICONS: Record<QuadrantId, typeof Gauge> = {
  technical: Gauge,
  content: FileText,
  search: TrendingUp,
  authority: Link2,
};

const QUADRANT_NOTES: Record<QuadrantId, string> = {
  technical: "HTTPS, redirects, crawlability, metadata foundations",
  content: "Titles, descriptions, headings, images, duplication",
  search: "Social tags, structured data — lab/field data only if connected",
  authority: "Backlinks, rankings, GBP need connected sources; NAP observed on-site",
};

function useStoredAudit(): StoredAudit | null {
  const [data] = useState(() => {
    try {
      const raw = sessionStorage.getItem("mogen_audit");
      if (!raw) return null;
      return JSON.parse(raw) as StoredAudit;
    } catch {
      return null;
    }
  });
  return data;
}

export default function GrowthAuditResults({ numbering = 1 }: Readonly<Props>) {
  const data = useStoredAudit();

  if (!data) {
    return (
      <PageShell
        index={`// ${formatNumber(numbering)} — Audit Results`}
        label="Growth Audit Results"
        title={
          <>
            No audit <span className="text-catalyst">to show.</span>
          </>
        }
        intro="You haven't run a Growth Audit yet. Take two minutes to scan your site and get your personalised PDF report."
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

  const url = data.url as string;
  const name = typeof data.name === "string" ? data.name : "";
  const email = typeof data.email === "string" ? data.email : "";
  const reportEmailed = data.reportEmailed === true;
  const quadrants = Array.isArray(data.quadrants) ? data.quadrants : [];
  const crawl = (data.crawl ?? {}) as {
    pagesAnalysed?: number;
    redirects?: { url: string; status: number }[];
  };
  const score = typeof data.score === "number" ? data.score : null;
  const coverage =
    typeof data.coverage === "number" ? Math.round((data.coverage as number) * 100) : 0;
  const provisional = data.provisional === true;
  const passed = Number(data.passed ?? 0);
  const warnings = Number(data.warnings ?? 0);
  const failed = Number(data.failed ?? 0);
  const notAssessed = Number(data.notAssessed ?? 0);

  const band =
    score === null
      ? "Not enough data"
      : score < 50
        ? "Critical headroom"
        : score < 70
          ? "Falling behind"
          : "Emerging";

  const quadrantOrder: QuadrantId[] = ["technical", "content", "search", "authority"];

  return (
    <PageShell
      index={`// ${formatNumber(numbering)} — Audit Results`}
      label="Your Growth Audit Results"
      title={
        <>
          Your growth <span className="text-catalyst">score.</span>
        </>
      }
      intro={`Measured score for ${url}. The full breakdown is in your PDF report${reportEmailed && email ? `, emailed to ${email}` : ""}.`}
    >
      {/* Score */}
      <BlueprintGrid className="bg-bone pb-16">
        <div className="mx-auto max-w-[1600px] px-6 lg:px-10">
          <div className="grid grid-cols-1 gap-px bg-ink/10 lg:grid-cols-3">
            <div className="bg-bone p-8 lg:p-10">
              <span className="small-caps text-ink/50">
                SEO Health Score{provisional ? " — Provisional" : ""}
              </span>
              <div className="mt-4 flex items-end gap-3">
                <span className="font-display text-7xl font-black text-catalyst">
                  {score ?? "—"}
                </span>
                <span className="mb-3 text-ink/50">/ 100</span>
              </div>
              <div className="mt-4 h-2 w-full bg-ink/10">
                <div
                  className="h-full bg-catalyst"
                  style={{ width: `${score ?? 0}%` }}
                />
              </div>
              <p className="mt-4 small-caps text-ink/60">{band}</p>
              <p className="mt-2 text-sm text-ink/60">
                Assessment coverage {coverage}% — {Number(data.assessed ?? 0)} of{" "}
                {Number(data.applicable ?? 0)} applicable checks assessed.
                {provisional && " Coverage is low, so this score is provisional."}
              </p>
            </div>
            <div className="bg-bone p-8 lg:p-10">
              <span className="small-caps text-ink/50">Measured</span>
              <div className="mt-4 space-y-2 text-ink/80">
                <p className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-emerald-500" /> {passed} passed
                </p>
                <p className="flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-amber-500" /> {warnings} warnings
                </p>
                <p className="flex items-center gap-2">
                  <XCircle className="h-4 w-4 text-catalyst" /> {failed} failed
                </p>
                <p className="flex items-center gap-2">
                  <MinusCircle className="h-4 w-4 text-ink/40" /> {notAssessed} not assessed
                </p>
              </div>
            </div>
            <div className="bg-bone p-8 lg:p-10">
              <span className="small-caps text-ink/50">Crawl</span>
              <p className="mt-4 text-lg text-ink/80">
                Hi{name ? `, ${name.split(" ")[0]}` : ""} —{" "}
                {crawl.pagesAnalysed ?? "?"} page{(crawl.pagesAnalysed ?? 0) === 1 ? "" : "s"} analysed
                (max 10), plus robots.txt and sitemap where reachable.
              </p>
              {(crawl.redirects ?? []).length > 0 && (
                <div className="mt-3 text-sm text-ink/60">
                  <span className="small-caps">Redirect chain</span>
                  <ol className="mt-1 list-decimal space-y-1 pl-5">
                    {(crawl.redirects ?? []).map((r) => (
                      <li key={r.url} className="break-all">
                        {r.status} — {r.url}
                      </li>
                    ))}
                    <li className="break-all">final — {url}</li>
                  </ol>
                </div>
              )}
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
            {quadrantOrder.map((id) => {
              const Icon = QUADRANT_ICONS[id] ?? MapPin;
              const q = (quadrants as { id: QuadrantId; score: number | null }[]).find(
                (x) => x.id === id,
              );
              return (
                <div key={id} className="bg-bone p-6">
                  <Icon
                    className="h-6 w-6 text-catalyst"
                    strokeWidth={1.5}
                    aria-hidden="true"
                  />
                  <h3 className="mt-4 font-display text-lg font-black text-ink">
                    {QUADRANT_LABELS[id]}
                  </h3>
                  <div className="mt-3 flex items-end gap-2">
                    <span className="font-display text-3xl font-black text-ink">
                      {q?.score ?? "—"}
                    </span>
                    <span className="mb-1 text-sm text-ink/50">
                      {q?.score === null || q?.score === undefined ? "not assessed" : "/ 100"}
                    </span>
                  </div>
                  {q?.score !== null && q?.score !== undefined && (
                    <div className="mt-2 h-1.5 w-full bg-ink/10">
                      <div
                        className="h-full bg-catalyst"
                        style={{ width: `${q.score}%` }}
                      />
                    </div>
                  )}
                  <p className="mt-3 text-xs text-ink/60">{QUADRANT_NOTES[id]}</p>
                </div>
              );
            })}
          </div>
          <p className="mt-6 text-xs text-ink/50">
            Rankings, traffic, backlinks, Domain Authority, Search Console, Analytics, Business Profile
            and Core Web Vitals field data are never invented — the full evidence behind every finding
            is in your PDF report.
          </p>
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
              Want us to fix everything in your report?
            </h2>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row">
            <MagneticButton
              as="a"
              href={buildEnquiryHref({ service: "seo", website: url })}
              variant="catalyst"
            >
              Book a Strategy Call <ArrowRight className="h-4 w-4" />
            </MagneticButton>
            <MagneticButton
              as="a"
              href="/pricing"
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
