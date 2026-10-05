"use client";

import { ArrowRight, CheckCircle2, Loader2, Search, ShieldCheck } from "lucide-react";
import { useRouter } from "next/navigation";
import Script from "next/script";
import { type SubmitEvent, useEffect, useRef, useState } from "react";
import { SERVICES } from "@/data/services";
import { buildEnquiryHref } from "@/lib/enquiry/enquiry";
import { formatNumber } from "@/lib/utils";
import BlueprintGrid from "./blueprint-grid";
import MagneticButton from "./magnet-button";
import type { AuditResult } from "@/lib/audit/types";
import { prevalidateUrl } from "@/lib/audit/prevalidate";

const STEPS = ["URL", "Scan", "Report", "Unlock"];

const TURNSTILE_SITE_KEY = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY ?? "";

type TurnstileWidgetId = string;
interface TurnstileApi {
  render: (
    container: HTMLElement,
    options: {
      sitekey: string;
      action: string;
      theme: "light" | "dark" | "auto";
      callback: (token: string) => void;
      "expired-callback"?: () => void;
      "error-callback"?: () => void;
    },
  ) => TurnstileWidgetId;
  reset: (widgetId: TurnstileWidgetId) => void;
}

declare global {
  interface Window {
    turnstile?: TurnstileApi;
  }
}

interface WidgetSlot {
  id: TurnstileWidgetId | null;
  /** Container element the widget was rendered into (remounts need a fresh render). */
  el: HTMLElement | null;
}

interface Props {
  numbering?: number;
}

export default function GrowthAudit({ numbering = 1 }: Readonly<Props>) {
  const [step, setStep] = useState(0);
  const [url, setUrl] = useState("");
  const [scanning, setScanning] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [audit, setAudit] = useState<AuditResult | null>(null);
  const [auditId, setAuditId] = useState<string | null>(null);
  const [apiError, setApiError] = useState("");
  const [scanToken, setScanToken] = useState("");
  const [leadToken, setLeadToken] = useState("");
  const scanContainer = useRef<HTMLDivElement>(null);
  const leadContainer = useRef<HTMLDivElement>(null);
  const scanSlot = useRef<WidgetSlot>({ id: null, el: null });
  const leadSlot = useRef<WidgetSlot>({ id: null, el: null });
  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
    business_name: "",
    service_interest: "seo",
    // Honeypot — hidden from humans, bots fill it in.
    companyWebsite: "",
  });
  const [saving, setSaving] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState("");
  const router = useRouter();

  // Live elapsed counter while the real request is in flight.
  useEffect(() => {
    if (!scanning) return;
    const started = Date.now();
    const timer = setInterval(() => {
      setElapsed(Math.floor((Date.now() - started) / 1000));
    }, 500);
    return () => clearInterval(timer);
  }, [scanning]);

  function renderWidget(
    container: React.RefObject<HTMLDivElement | null>,
    slot: React.MutableRefObject<WidgetSlot>,
    action: string,
    callback: (token: string) => void,
  ) {
    if (
      !TURNSTILE_SITE_KEY ||
      !container.current ||
      typeof window.turnstile === "undefined"
    ) {
      return;
    }
    // A stored ID is only proof for the container it was rendered into:
    // step changes unmount/remount the container, which needs a fresh widget.
    if (slot.current.id !== null && slot.current.el === container.current) {
      return;
    }
    slot.current = {
      id: window.turnstile.render(container.current, {
        sitekey: TURNSTILE_SITE_KEY,
        action,
        theme: "auto",
        callback,
        "expired-callback": () => callback(""),
        "error-callback": () => callback(""),
      }),
      el: container.current,
    };
  }

  function resetWidget(slot: React.MutableRefObject<WidgetSlot>, clear: () => void) {
    try {
      if (slot.current.id !== null && typeof window.turnstile !== "undefined") {
        window.turnstile.reset(slot.current.id);
      }
    } catch {
      // Detached widget (container unmounted) — a fresh render follows on remount.
    }
    clear();
  }

  const runScan = async () => {
    const problem = prevalidateUrl(url);
    if (problem) {
      setApiError(problem);
      setStep(0);
      return;
    }
    if (scanning) return;
    const target = url.trim();
    setElapsed(0);
    setScanning(true);
    setApiError("");
    setAudit(null);
    setAuditId(null);
    setStep(1);
    try {
      const res = await fetch("/api/audit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        // Client-side cap so the UI can never spin forever.
        signal: AbortSignal.timeout(120_000),
        body: JSON.stringify({
          url: target,
          ...(scanToken ? { turnstileToken: scanToken } : {}),
        }),
      });
      let data: { ok: boolean; error?: string; audit?: AuditResult; auditId?: string };
      try {
        data = (await res.json()) as typeof data;
      } catch {
        throw new Error("unparseable");
      }
      if (!res.ok || !data.ok || !data.audit || typeof data.auditId !== "string") {
        throw new Error(data.error ?? "The website could not be analysed.");
      }
      setAudit(data.audit);
      setAuditId(data.auditId);
      setScanning(false);
      setStep(2);
    } catch (err) {
      const message =
        err instanceof DOMException && err.name === "TimeoutError"
          ? "The analysis took too long. Please check the address and try again."
          : err instanceof Error && err.message !== "unparseable"
            ? err.message
            : "The website could not be analysed. Please check the address and try again.";
      setApiError(message);
      resetWidget(scanSlot, () => setScanToken(""));
      setScanning(false);
      setStep(0);
    }
  };

  const submit = async (e: SubmitEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!form.name.trim() || !form.email.trim()) {
      setError("Name and email are required to receive your report.");
      return;
    }
    if (!audit || !auditId) {
      setError("Please run the website scan first.");
      return;
    }
    setSaving(true);
    setError("");
    try {
      const res = await fetch("/api/audit/lead", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        signal: AbortSignal.timeout(120_000),
        body: JSON.stringify({
          lead: {
            name: form.name.trim(),
            email: form.email.trim(),
            phone: form.phone.trim(),
            business: form.business_name.trim(),
            service: form.service_interest,
            companyWebsite: form.companyWebsite,
          },
          auditId,
          ...(leadToken ? { turnstileToken: leadToken } : {}),
        }),
      });
      let data: { ok: boolean; error?: string };
      try {
        data = (await res.json()) as typeof data;
      } catch {
        throw new Error("unparseable");
      }
      if (!res.ok || !data.ok) {
        throw new Error(
          data.error ?? "Something went wrong. Please try again or email us directly.",
        );
      }
      try {
        sessionStorage.setItem(
          "mogen_audit",
          JSON.stringify({
            url: audit.site.finalUrl,
            submittedUrl: audit.site.submittedUrl,
            score: audit.summary.score,
            provisional: audit.summary.provisional,
            coverage: audit.summary.coverage,
            passed: audit.summary.passed,
            warnings: audit.summary.warnings,
            failed: audit.summary.failed,
            notAssessed: audit.summary.notAssessed,
            assessed: audit.summary.assessed,
            applicable: audit.summary.applicable,
            quadrants: audit.quadrants,
            crawl: audit.crawl,
            name: form.name,
            email: form.email,
            business: form.business_name,
            service: form.service_interest,
            reportEmailed: true,
          }),
        );
      } catch {
        // Storage failure must not block the success state — the PDF is emailed.
      }
      setSaving(false);
      setStep(3);
      setDone(true);
    } catch (err) {
      setSaving(false);
      resetWidget(leadSlot, () => setLeadToken(""));
      setError(
        err instanceof Error && err.message !== "unparseable"
          ? err.message
          : "Something went wrong. Please try again or email us directly.",
      );
    }
  };

  const score = audit?.summary.score;
  const coveragePct =
    audit !== null ? Math.round(audit.summary.coverage * 100) : 0;

  return (
    <BlueprintGrid
      id={"audit"}
      className="bg-ink dark:bg-secondary py-24 text-white dark:text-secondary-foreground lg:py-32"
    >
      <div className="mx-auto max-w-[1600px] px-6 lg:px-10">
        <div className="mb-10 flex items-center gap-4">
          <span className="small-caps text-catalyst">
            {`// ${formatNumber(numbering)} — Lead Generation`}
          </span>
          <span
            className="h-px flex-1 max-w-30 bg-white/30 dark:bg-secondary-foreground/30"
            aria-hidden="true"
          />
          <span className="small-caps text-white/70 dark:text-secondary-foreground/70">Mogen Growth Audit</span>
        </div>

        <div className="grid grid-cols-1 gap-12 lg:grid-cols-2 lg:gap-20">
          {/* LEFT — copy */}
          <div>
            <h2 className="font-display text-4xl font-black leading-[1.05] lg:text-6xl text-balance">
              Get your free
              <br />
              <span className="text-catalyst">Growth Audit.</span>
            </h2>
            <p className="mt-6 max-w-md text-lg text-white/70 dark:text-secondary-foreground/70">
              Enter your website URL. We fetch and measure it against the Mogen 37-step
              framework — then email you a personalised PDF report with the results.
            </p>

            <div className="mt-10 space-y-4">
              {[
                "Technical SEO & indexation health",
                "On-page content & metadata",
                "Structured data & social tags",
                "Local business signals",
              ].map((f) => (
                <div key={f} className="flex items-center gap-3 text-white/80 dark:text-secondary-foreground/80">
                  <CheckCircle2
                    className="h-5 w-5 text-catalyst"
                    aria-hidden="true"
                  />
                  <span>{f}</span>
                </div>
              ))}
            </div>

            {/* progress steps */}
            <div className="mt-12 flex flex-wrap items-center gap-2">
              {STEPS.map((s, i) => (
                <div key={s} className="flex items-center gap-2">
                  <span
                    className={
                      "flex h-7 items-center justify-center rounded-full px-3 small-caps transition-colors " +
                      (i <= step
                        ? "bg-catalyst text-black"
                        : "bg-white/10 dark:bg-secondary-foreground/10 text-white/70 dark:text-secondary-foreground/70")
                    }
                  >
                    {s}
                  </span>
                  {i < STEPS.length - 1 && (
                    <span className="h-px w-6 bg-white/20 dark:bg-secondary-foreground/20" aria-hidden="true" />
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* RIGHT — interactive panel */}
          <div className="relative border border-white/30 bg-white/5 p-6 dark:border-secondary-foreground/40 dark:bg-secondary-foreground/10 lg:p-8">
            <div
              className="absolute left-0 top-0 h-6 w-px bg-catalyst"
              aria-hidden="true"
            />
            <div
              className="absolute left-0 top-0 h-px w-6 bg-catalyst"
              aria-hidden="true"
            />

            {/* STEP 0 — URL */}
            {step === 0 && (
              <div>
                <label htmlFor="audit-url" className="small-caps text-white/70 dark:text-secondary-foreground/70">
                  Enter your website URL
                </label>
                <div className="mt-4 flex flex-col gap-3 sm:flex-row">
                  <div className="flex min-w-0 flex-1 items-center gap-2 border border-white/30 dark:border-secondary-foreground/40 bg-white/5 dark:bg-secondary-foreground/10 px-4">
                    <Search
                      className="h-5 w-5 shrink-0 text-white/70 dark:text-secondary-foreground/70"
                      aria-hidden="true"
                    />
                    <input
                      id={"audit-url"}
                      type="text"
                      value={url}
                      onChange={(e) => {
                        setUrl(e.target.value);
                        if (apiError) setApiError("");
                      }}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          runScan();
                        }
                      }}
                      placeholder="yourbusiness.co.za"
                      aria-invalid={apiError ? true : undefined}
                      aria-describedby={apiError ? "audit-url-error" : undefined}
                      className="w-full min-w-0 bg-transparent py-4 text-white placeholder:text-white/60 focus:outline-none dark:text-secondary-foreground dark:placeholder:text-secondary-foreground/60"
                    />
                  </div>
                  <MagneticButton
                    variant="catalyst"
                    className="text-black hover:bg-ink hover:text-white dark:hover:text-black"
                    onClick={runScan}
                    aria-label="Run growth audit scan"
                  >
                    Scan
                  </MagneticButton>
                </div>
                {TURNSTILE_SITE_KEY ? (
                  <>
                    <Script
                      src="https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit"
                      strategy="afterInteractive"
                      onReady={() =>
                        renderWidget(scanContainer, scanSlot, "audit", setScanToken)
                      }
                    />
                    <div ref={scanContainer} className="mt-4" />
                  </>
                ) : null}
                {apiError && (
                  <div
                    id="audit-url-error"
                    role="alert"
                    className="mt-4 border border-catalyst/60 bg-catalyst/10 px-4 py-3"
                  >
                    <p className="text-sm font-semibold text-catalyst">
                      We couldn&apos;t analyse that address.
                    </p>
                    <p className="mt-1 text-sm text-white/80 dark:text-secondary-foreground/80">
                      {apiError}
                    </p>
                    <p className="mt-2 text-xs text-white/60 dark:text-secondary-foreground/60">
                      Check the spelling and try again — e.g. yourbusiness.co.za
                    </p>
                  </div>
                )}
                <p className="mt-4 text-xs text-white/70 dark:text-secondary-foreground/70">
                  No signup required for the scan. Add your details afterwards and
                  we&apos;ll email you the PDF report.
                </p>
              </div>
            )}

            {/* STEP 1 — scanning (real request in flight) */}
            {step === 1 && (
              <div className="relative min-h-70">
                <div className="flex min-w-0 items-center gap-3 text-white/70 dark:text-secondary-foreground/70">
                  <Loader2
                    className="h-5 w-5 shrink-0 animate-spin text-catalyst"
                    aria-hidden="true"
                  />
                  <span className="small-caps min-w-0 truncate">Scanning {url.trim()}</span>
                </div>
                <div className="relative mt-6 h-55 overflow-hidden border border-white/30 dark:border-secondary-foreground/40">
                  <div
                    className="absolute inset-x-0 h-0.5 bg-catalyst shadow-[0_0_12px_2px_hsl(var(--catalyst))] animate-scan"
                    aria-hidden="true"
                  />
                  <div className="grid grid-cols-8 gap-1 p-3 opacity-40">
                    {Array.from({ length: 64 }).map((_, i) => (
                      <span
                        // biome-ignore lint/suspicious/noArrayIndexKey: We need a key
                        key={i}
                        className="h-3 w-full bg-white/20 dark:bg-secondary-foreground/20"
                      />
                    ))}
                  </div>
                  <div className="absolute bottom-3 left-3 right-3 space-y-1.5 text-xs text-white/70 dark:text-secondary-foreground/70">
                    <div>› fetching website server-side…</div>
                    <div>› crawling same-origin pages (max 10)…</div>
                    <div>› checking robots.txt &amp; sitemap…</div>
                    <div>› running 37 deterministic checks…</div>
                  </div>
                </div>
                <p className="mt-4 text-xs text-white/70 dark:text-secondary-foreground/70" role="status">
                  Analysis running — {elapsed}s elapsed. Most sites take 10–60 seconds.
                </p>
              </div>
            )}

            {/* STEP 2 — score + lead form (detail lives in the emailed PDFs) */}
            {step === 2 && audit !== null && (
              <div>
                <div className="flex min-w-0 items-center justify-between gap-3">
                  <span className="small-caps shrink-0 text-white/70 dark:text-secondary-foreground/70">
                    SEO Health Score{audit.summary.provisional ? " (Provisional)" : ""}
                  </span>
                  <span className="small-caps min-w-0 truncate text-white/70 dark:text-secondary-foreground/70">{audit.site.finalUrl}</span>
                </div>
                <div className="mt-4 flex items-end gap-4">
                  <span className="font-display text-7xl font-black text-catalyst">
                    {score ?? "—"}
                  </span>
                  <span className="mb-3 text-white/70 dark:text-secondary-foreground/70">/ 100</span>
                </div>
                <div className="mt-3 h-2 w-full bg-white/10 dark:bg-secondary-foreground/10">
                  <div
                    className="h-full bg-catalyst transition-all duration-1000"
                    style={{ width: `${score ?? 0}%` }}
                  />
                </div>
                <p className="mt-4 text-sm text-white/70 dark:text-secondary-foreground/70">
                  Measured across {audit.summary.assessed} of {audit.summary.applicable}{" "}
                  applicable checks ({coveragePct}% coverage) on {audit.crawl.pagesAnalysed}{" "}
                  page{audit.crawl.pagesAnalysed === 1 ? "" : "s"}
                  {audit.summary.provisional ? " — coverage is low, so this score is provisional" : ""}.
                </p>
                <p className="mt-2 text-sm text-white/70 dark:text-secondary-foreground/70">
                  The full breakdown is in your PDF report — add your details below
                  and we&apos;ll email it to you.
                </p>

                <form onSubmit={submit} className="mt-6 space-y-3">
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <Field
                      label="Name"
                      value={form.name}
                      onChange={(v: string) => setForm({ ...form, name: v })}
                    />
                    <Field
                      label="Email"
                      type="email"
                      value={form.email}
                      onChange={(v: string) => setForm({ ...form, email: v })}
                    />
                    <Field
                      label="Phone"
                      value={form.phone}
                      onChange={(v: string) => setForm({ ...form, phone: v })}
                    />
                    <Field
                      label="Business"
                      value={form.business_name}
                      onChange={(v: string) =>
                        setForm({ ...form, business_name: v })
                      }
                    />
                  </div>
                  <div>
                    <label htmlFor="svc" className="small-caps text-white/70 dark:text-secondary-foreground/70">
                      Service interest
                    </label>
                    <select
                      id={"svc"}
                      value={form.service_interest}
                      onChange={(e) =>
                        setForm({ ...form, service_interest: e.target.value })
                      }
                      className="mt-2 w-full border border-white/30 bg-white/5 px-4 py-3 text-white focus:outline-none dark:border-secondary-foreground/40 dark:bg-secondary-foreground/10 dark:text-secondary-foreground"
                    >
                      {SERVICES.map((s) => (
                        <option key={s.name} value={s.slug}>
                          {s.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  {/* Honeypot — invisible to humans */}
                  <div className="hidden" aria-hidden="true">
                    <label htmlFor="audit-company-website">Company website</label>
                    <input
                      id={"audit-company-website"}
                      name="companyWebsite"
                      type="text"
                      tabIndex={-1}
                      autoComplete="off"
                      value={form.companyWebsite}
                      onChange={(e) => setForm({ ...form, companyWebsite: e.target.value })}
                    />
                  </div>
                  {TURNSTILE_SITE_KEY ? (
                    <>
                      <Script
                        src="https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit"
                        strategy="afterInteractive"
                        onReady={() =>
                          renderWidget(leadContainer, leadSlot, "audit-lead", setLeadToken)
                        }
                      />
                      <div ref={leadContainer} />
                    </>
                  ) : null}
                  {error && <p className="text-sm text-catalyst" role="alert">{error}</p>}
                  <MagneticButton
                    type="submit"
                    variant="catalyst"
                    className="w-full text-black hover:bg-ink hover:text-white dark:hover:text-black"
                    disabled={saving}
                    aria-label="Email me the PDF report"
                  >
                    {saving ? "Sending…" : "Email Me the PDF Report"}
                    {!saving && <ArrowRight className="h-4 w-4" />}
                  </MagneticButton>
                </form>
              </div>
            )}

            {/* STEP 3 — done */}
            {step === 3 && done && (
              <div className="flex min-h-70 flex-col items-start justify-center">
                <ShieldCheck
                  className="h-12 w-12 text-catalyst"
                  aria-hidden="true"
                />
                <h3 className="mt-6 font-display text-3xl font-black">
                  Report sent.
                </h3>
                <p className="mt-3 max-w-sm text-white/70 dark:text-secondary-foreground/70">
                  Thanks{form.name ? `, ${form.name.split(" ")[0]}` : ""}. Your
                  personalised PDF report is on its way to{" "}
                  <span className="text-catalyst">{form.email}</span>. A Mogen
                  strategist will reach out within 24 hours.
                </p>
                <MagneticButton
                  onClick={() => router.push("/growth-audit-results")}
                  variant="catalyst"
                  className="mt-8 w-full text-black hover:bg-ink hover:text-white dark:hover:text-black"
                >
                  View My Score <ArrowRight className="h-4 w-4" />
                </MagneticButton>
                <MagneticButton
                  as="a"
                  href={buildEnquiryHref({
                    service: "seo",
                    website: audit?.site.finalUrl ?? url.trim(),
                  })}
                  variant="outline"
                  className="mt-3 w-full border-white/40 text-white hover:bg-white hover:text-ink dark:border-secondary-foreground/40 dark:text-secondary-foreground dark:hover:bg-secondary-foreground dark:hover:text-secondary"
                >
                  Discuss my SEO results
                </MagneticButton>
              </div>
            )}
          </div>
        </div>
        <p className="mt-8 text-xs text-white/40">
          Measured from your public website HTML, robots.txt and sitemap only. Rankings, traffic,
          backlinks and Google data are marked “not assessed” unless those sources are connected —{" "}
          technical SEO never invents them.
        </p>
      </div>
    </BlueprintGrid>
  );
}

interface FieldProps {
  label: string;
  value?: string;
  type?: string;
  onChange: FunctionStringCallback;
}

function Field({
  label,
  value,
  onChange,
  type = "text",
}: Readonly<FieldProps>) {
  const id = `audit-${label.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`;
  return (
    <div>
      <label htmlFor={id} className="small-caps text-white/70 dark:text-secondary-foreground/70">
        {label}
      </label>
      <input
        id={id}
        name={id}
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="mt-2 w-full border border-white/30 bg-white/5 px-4 py-3 text-white placeholder:text-white/60 focus:outline-none dark:border-secondary-foreground/40 dark:bg-secondary-foreground/10 dark:text-secondary-foreground dark:placeholder:text-secondary-foreground/60"
      />
    </div>
  );
}
