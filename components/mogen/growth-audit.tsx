"use client";

import {
  ArrowRight,
  CheckCircle2,
  Loader2,
  Search,
  ShieldCheck,
} from "lucide-react";
// import { useNavigate } from "react-router-dom";
// import { Image } from "@/components/ui/image";
import { useRouter } from "next/navigation";
import { useState } from "react";
import BlueprintGrid, { SectionLabel } from "./blueprint-grid";
import MagneticButton from "./magnet-button";

const STEPS = ["URL", "Scan", "Report", "Unlock"];

export default function GrowthAudit() {
  const [step, setStep] = useState(0);
  const [url, setUrl] = useState("");
  const [scanning, setScanning] = useState(false);
  const [score, setScore] = useState(0);
  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
    business_name: "",
    service_interest: "Full Growth Package",
  });
  const [saving, setSaving] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState("");
  // const navigate = useNavigate();
  const router = useRouter();

  const runScan = () => {
    if (!url.trim()) return;
    setScanning(true);
    setStep(1);
    setTimeout(() => {
      const s = Math.floor(38 + Math.random() * 22); //TODO: 38–59 — room to grow
      setScore(s);
      setScanning(false);
      setStep(2);
    }, 2200);
  };

  const submit = async (e) => {
    e.preventDefault();
    if (!form.name || !form.email) {
      setError("Name and email are required to unlock your report.");
      return;
    }
    setSaving(true);
    setError("");
    try {
      // await base44.entities.Lead.create({
      //   ...form,
      //   website_url: url,
      //   audit_score: score,
      //   status: "new",
      // });
      sessionStorage.setItem(
        "mogen_audit",
        JSON.stringify({
          url,
          score,
          name: form.name,
          email: form.email,
          business: form.business_name,
          service: form.service_interest,
        }),
      );
      setSaving(false);
      setStep(3);
      setDone(true);
    } catch (err) {
      setSaving(false);
      setError("Something went wrong. Please try again or email us directly.");
    }
  };

  return (
    <BlueprintGrid id={"audit"} className="bg-ink py-24 text-bone lg:py-32">
      <div className="mx-auto max-w-[1600px] px-6 lg:px-10">
        <div className="mb-10 flex items-center gap-4">
          <span className="small-caps text-catalyst">
            {"// 02 — Lead Generation"}
          </span>
          <span
            className="h-px flex-1 max-w-30 bg-bone/30"
            aria-hidden="true"
          />
          <span className="small-caps text-bone/50">Mogen Growth Audit</span>
        </div>

        <div className="grid grid-cols-1 gap-12 lg:grid-cols-2 lg:gap-20">
          {/* LEFT — copy */}
          <div>
            <h2 className="font-display text-4xl font-black leading-[1.05] lg:text-6xl text-balance">
              Get your free
              <br />
              <span className="text-catalyst">Growth Audit.</span>
            </h2>
            <p className="mt-6 max-w-md text-lg text-bone/70">
              Enter your website URL. We scan it against the Mogen 37-step
              framework — scoring SEO, speed, conversions and local visibility —
              then send you a prioritised blueprint to rank and grow.
            </p>

            <div className="mt-10 space-y-4">
              {[
                "Technical SEO & indexation health",
                "Core Web Vitals & page speed",
                "Local SEO & Google Business Profile",
                "Conversion path & lead capture",
              ].map((f) => (
                <div key={f} className="flex items-center gap-3 text-bone/80">
                  <CheckCircle2
                    className="h-5 w-5 text-catalyst"
                    aria-hidden="true"
                  />
                  <span>{f}</span>
                </div>
              ))}
            </div>

            {/* progress steps */}
            <div className="mt-12 flex items-center gap-2">
              {STEPS.map((s, i) => (
                <div key={s} className="flex items-center gap-2">
                  <span
                    className={
                      "flex h-7 items-center justify-center rounded-full px-3 small-caps transition-colors " +
                      (i <= step
                        ? "bg-catalyst text-white"
                        : "bg-bone/10 text-bone/50")
                    }
                  >
                    {s}
                  </span>
                  {i < STEPS.length - 1 && (
                    <span className="h-px w-6 bg-bone/20" aria-hidden="true" />
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* RIGHT — interactive schematic */}
          <div className="relative border border-bone/15 bg-bone/3 p-6 lg:p-8">
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
                <label htmlFor="audit-url" className="small-caps text-bone/60">
                  Enter your website URL
                </label>
                <div className="mt-4 flex gap-3">
                  <div className="flex flex-1 items-center gap-2 border border-bone/20 bg-bone/5 px-4">
                    <Search
                      className="h-5 w-5 text-bone/40"
                      aria-hidden="true"
                    />
                    <input
                      id={"audit-url"}
                      type="text"
                      value={url}
                      onChange={(e) => setUrl(e.target.value)}
                      placeholder="yourbusiness.co.za"
                      className="w-full bg-transparent py-4 text-bone placeholder:text-bone/30 focus:outline-none"
                    />
                  </div>
                  <MagneticButton
                    variant="catalyst"
                    onClick={runScan}
                    aria-label="Run growth audit scan"
                  >
                    Scan
                  </MagneticButton>
                </div>
                <p className="mt-4 text-xs text-bone/40">
                  No signup required for the scan. Unlock the full report with
                  your details.
                </p>
              </div>
            )}

            {/* STEP 1 — scanning */}
            {step === 1 && (
              <div className="relative min-h-70">
                <div className="flex items-center gap-3 text-bone/70">
                  <Loader2
                    className="h-5 w-5 animate-spin text-catalyst"
                    aria-hidden="true"
                  />
                  <span className="small-caps">Scanning {url}</span>
                </div>
                <div className="relative mt-6 h-55 overflow-hidden border border-bone/10">
                  <div
                    className="absolute inset-x-0 h-0.5 bg-catalyst shadow-[0_0_12px_2px_hsl(var(--catalyst))] animate-scan"
                    aria-hidden="true"
                  />
                  <div className="grid grid-cols-8 gap-1 p-3 opacity-40">
                    {Array.from({ length: 64 }).map((_, i) => (
                      // biome-ignore lint/suspicious/noArrayIndexKey: We need a key
                      <span key={i} className="h-3 w-full bg-bone/20" />
                    ))}
                  </div>
                  <div className="absolute bottom-3 left-3 right-3 space-y-1.5 text-xs text-bone/50">
                    <div className="animate-pulse">
                      › analysing crawl budget…
                    </div>
                    <div
                      className="animate-pulse"
                      style={{ animationDelay: "0.3s" }}
                    >
                      › checking indexation…
                    </div>
                    <div
                      className="animate-pulse"
                      style={{ animationDelay: "0.6s" }}
                    >
                      › measuring Core Web Vitals…
                    </div>
                    <div
                      className="animate-pulse"
                      style={{ animationDelay: "0.9s" }}
                    >
                      › mapping local grid…
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* STEP 2 — report + form */}
            {step === 2 && (
              <div>
                <div className="flex items-center justify-between">
                  <span className="small-caps text-bone/60">Growth Score</span>
                  <span className="small-caps text-bone/40">{url}</span>
                </div>
                <div className="mt-4 flex items-end gap-4">
                  <span className="font-display text-7xl font-black text-catalyst">
                    {score}
                  </span>
                  <span className="mb-3 text-bone/50">/ 100</span>
                </div>
                <div className="mt-3 h-2 w-full bg-bone/10">
                  <div
                    className="h-full bg-catalyst transition-all duration-1000"
                    style={{ width: `${score}%` }}
                  />
                </div>
                <p className="mt-4 text-sm text-bone/70">
                  Your site has clear growth headroom. Unlock the full
                  prioritised blueprint — enter your details below.
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
                    <label htmlFor="svc" className="small-caps text-bone/60">
                      Service interest
                    </label>
                    <select
                      id={"svc"}
                      value={form.service_interest}
                      onChange={(e) =>
                        setForm({ ...form, service_interest: e.target.value })
                      }
                      className="mt-2 w-full border border-bone/20 bg-bone/5 px-4 py-3 text-bone focus:outline-none"
                    >
                      {[
                        "Web Development",
                        "Brand Identity",
                        "SEO Services",
                        "Digital Marketing",
                        "Full Growth Package",
                      ].map((o) => (
                        <option key={o} value={o} className="bg-ink">
                          {o}
                        </option>
                      ))}
                    </select>
                  </div>
                  {error && <p className="text-sm text-catalyst">{error}</p>}
                  <MagneticButton
                    type="submit"
                    variant="catalyst"
                    className="w-full"
                    disabled={saving}
                    aria-label="Unlock full growth report"
                  >
                    {saving ? "Unlocking…" : "Unlock Full Report"}
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
                  Report unlocked.
                </h3>
                <p className="mt-3 max-w-sm text-bone/70">
                  Thanks{form.name ? `, ${form.name.split(" ")[0]}` : ""}. Your
                  full Growth Audit blueprint is on its way to{" "}
                  <span className="text-catalyst">{form.email}</span>. A Mogen
                  strategist will reach out within 24 hours.
                </p>
                <MagneticButton
                  onClick={() => router.push("/growth-audit-results")}
                  variant="catalyst"
                  className="mt-8 w-full"
                >
                  View Full Results <ArrowRight className="h-4 w-4" />
                </MagneticButton>
                <MagneticButton
                  as="a"
                  href="#pricing"
                  variant="outline"
                  className="mt-3 w-full border-bone/40 text-bone hover:bg-bone hover:text-ink"
                >
                  See packages
                </MagneticButton>
              </div>
            )}
          </div>
        </div>
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
  return (
    <div>
      <label htmlFor={value} className="small-caps text-bone/60">
        {label}
      </label>
      <input
        name={value}
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="mt-2 w-full border border-bone/20 bg-bone/5 px-4 py-3 text-bone placeholder:text-bone/30 focus:outline-none"
      />
    </div>
  );
}
