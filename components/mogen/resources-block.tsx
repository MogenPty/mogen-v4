"use client";

import {
  ArrowRight,
  CheckCircle2,
  Download,
  FileText,
  Layout,
  MapPin,
  Search,
} from "lucide-react";
import { useState } from "react";
import BlueprintGrid from "./blueprint-grid";
import MagneticButton from "./magnet-button";
import PageShell from "./page-shell";

const RESOURCES = [
  {
    icon: Search,
    title: "Local SEO Checklist",
    desc: "The 37-point checklist we use to rank local businesses on Google.",
    type: "PDF Guide",
  },
  {
    icon: Layout,
    title: "Landing Page Pack",
    desc: "Conversion-optimised landing page templates built for South African SMEs.",
    type: "Templates",
  },
  {
    icon: FileText,
    title: "Growth Audit Worksheet",
    desc: "Score your own site against the Mogen framework, step by step.",
    type: "Worksheet",
  },
  {
    icon: MapPin,
    title: "Google Business Profile Kit",
    desc: "Setup, optimisation and review-request templates to win the map pack.",
    type: "Kit",
  },
];

export default function ResourcesBlock() {
  const [form, setForm] = useState({
    name: "",
    email: "",
    resource: RESOURCES[0].title,
  });
  const [saving, setSaving] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState("");

  const submit = async (e: { preventDefault: () => void }) => {
    e.preventDefault();
    if (!form.name || !form.email) {
      setError("Name and email are required.");
      return;
    }
    setSaving(true);
    setError("");
    try {
      //   await base44.entities.Lead.create({
      //     name: form.name,
      //     email: form.email,
      //     service_interest: "Full Growth Package",
      //     message: `Resource download: ${form.resource}`,
      //     status: "new",
      //   });
      setSaving(false);
      setDone(true);
    } catch (err) {
      setSaving(false);
      setError(
        "Something went wrong. Please try again or email hello@mogen.co.za.",
      );
    }
  };

  return (
    <PageShell
      index="// 16 — Resources"
      label="Resource Library"
      title={
        <>
          Free tools to <span className="text-catalyst">fuel your growth.</span>
        </>
      }
      intro="Download our best playbooks, checklists and templates — built for local South African businesses. Drop your details and we'll send the file straight over."
    >
      {/* Resource grid */}
      <BlueprintGrid className="bg-bone pb-16">
        <div className="mx-auto max-w-[1600px] px-6 lg:px-10">
          <div className="grid grid-cols-1 gap-px bg-ink/10 md:grid-cols-2 lg:grid-cols-4">
            {RESOURCES.map((r) => {
              const Icon = r.icon;
              return (
                <button
                  key={r.title}
                  type="button"
                  onClick={() => setForm({ ...form, resource: r.title })}
                  className={
                    "group flex flex-col bg-bone p-6 text-left transition-colors hover:bg-ink hover:text-bone " +
                    (form.resource === r.title
                      ? "ring-2 ring-inset ring-catalyst"
                      : "")
                  }
                >
                  <Icon
                    className="h-8 w-8 text-catalyst"
                    strokeWidth={1.5}
                    aria-hidden="true"
                  />
                  <span className="mt-4 small-caps text-ink/50 group-hover:text-bone/50">
                    {r.type}
                  </span>
                  <h3 className="mt-2 font-display text-lg font-black">
                    {r.title}
                  </h3>
                  <p className="mt-2 flex-1 text-sm opacity-80">{r.desc}</p>
                  <span className="mt-4 small-caps flex items-center gap-2 text-catalyst">
                    <Download className="h-4 w-4" /> Select
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </BlueprintGrid>

      {/* Capture form */}
      <BlueprintGrid className="bg-bone pb-24">
        <div className="mx-auto max-w-[1600px] px-6 lg:px-10">
          <div className="grid grid-cols-1 gap-px bg-ink/10 lg:grid-cols-2">
            <div className="bg-bone p-8 lg:p-12">
              <h2 className="font-display text-2xl font-black text-ink">
                Get your resource
              </h2>
              <p className="mt-3 text-ink/70">
                Selected:{" "}
                <span className="font-bold text-catalyst">{form.resource}</span>
              </p>
              <p className="mt-3 text-sm text-ink/60">
                Enter your details and we&apos;ll email the resource and a short
                note on how to use it. No spam — just the file and an offer to
                help.
              </p>
            </div>
            <div className="bg-bone p-8 lg:p-12">
              {done ? (
                <div className="flex min-h-65 flex-col items-start justify-center">
                  <CheckCircle2
                    className="h-12 w-12 text-catalyst"
                    aria-hidden="true"
                  />
                  <h3 className="mt-6 font-display text-2xl font-black text-ink">
                    On its way.
                  </h3>
                  <p className="mt-3 max-w-sm text-ink/70">
                    Thanks{form.name ? `, ${form.name.split(" ")[0]}` : ""}.
                    We&apos;ve sent{" "}
                    <span className="text-catalyst">{form.resource}</span> to{" "}
                    {form.email}.
                  </p>
                </div>
              ) : (
                <form onSubmit={submit}>
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <Field
                      label="Name"
                      value={form.name}
                      onChange={(v) => setForm({ ...form, name: v })}
                      required
                    />
                    <Field
                      label="Email"
                      type="email"
                      value={form.email}
                      onChange={(v) => setForm({ ...form, email: v })}
                      required
                    />
                  </div>
                  {error && (
                    <p className="mt-3 text-sm text-catalyst">{error}</p>
                  )}
                  <MagneticButton
                    type="submit"
                    variant="catalyst"
                    className="mt-6 w-full"
                    disabled={saving}
                    aria-label={`Download ${form.resource}`}
                  >
                    {saving ? "Sending…" : "Send My Resource"}
                    {!saving && <ArrowRight className="h-4 w-4" />}
                  </MagneticButton>
                </form>
              )}
            </div>
          </div>
        </div>
      </BlueprintGrid>

      <BlueprintGrid className="bg-ink py-20 text-bone">
        <div className="mx-auto flex max-w-[1600px] flex-col items-start justify-between gap-6 px-6 lg:flex-row lg:items-center lg:px-10">
          <h2 className="font-display text-3xl font-black lg:text-4xl text-balance">
            Want the full growth engine?
          </h2>
          <MagneticButton as="a" href="/contact" variant="catalyst">
            Talk to a Strategist <ArrowRight className="h-4 w-4" />
          </MagneticButton>
        </div>
      </BlueprintGrid>
    </PageShell>
  );
}

interface FieldProps {
  label: string;
  value: string;
  type?: string;
  required?: boolean;
  onChange: FunctionStringCallback;
}

function Field({
  label,
  value,
  onChange,
  type = "text",
  required,
}: Readonly<FieldProps>) {
  return (
    <div>
      <label htmlFor={value} className="small-caps text-ink/60">
        {label}
        {required && <span className="text-catalyst"> *</span>}
      </label>
      <input
        name={value}
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="mt-2 w-full border border-ink/15 bg-bone px-4 py-3 text-ink placeholder:text-ink/30 focus:outline-none"
      />
    </div>
  );
}
