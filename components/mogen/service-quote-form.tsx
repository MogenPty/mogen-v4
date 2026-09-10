"use client";

import { ArrowRight, CheckCircle2, Loader2 } from "lucide-react";
import { useState } from "react";
// import { base44 } from "@/api/base44Client";
import MagneticButton from "./magnet-button";

export default function ServiceQuoteForm({ serviceName }) {
  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
    business_name: "",
    message: "",
  });
  const [saving, setSaving] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState("");

  const submit = async (e) => {
    e.preventDefault();
    if (!form.name || !form.email) {
      setError("Name and email are required.");
      return;
    }
    setSaving(true);
    setError("");
    try {
      // await base44.entities.Lead.create({
      //   ...form,
      //   service_interest: serviceName,
      //   status: "new",
      // });
      setSaving(false);
      setDone(true);
    } catch (err) {
      setSaving(false);
      setError(
        "Something went wrong. Please try again or email hello@mogen.co.za.",
      );
    }
  };

  if (done) {
    return (
      <div className="flex min-h-80 flex-col items-start justify-center border border-ink/10 bg-bone p-8">
        <CheckCircle2 className="h-12 w-12 text-catalyst" aria-hidden="true" />
        <h3 className="mt-6 font-display text-3xl font-black text-ink">
          Request received.
        </h3>
        <p className="mt-3 max-w-sm text-ink/70">
          Thanks{form.name ? `, ${form.name.split(" ")[0]}` : ""}. A Mogen
          strategist will reach out about your{" "}
          <span className="text-catalyst">{serviceName}</span> project within 24
          hours.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="border border-ink/10 bg-bone p-8">
      <h3 className="font-display text-2xl font-black text-ink">
        Request a {serviceName} quote
      </h3>
      <p className="mt-2 text-sm text-ink/60">
        Tell us about your project. We'll send a tailored proposal within 24
        hours.
      </p>
      <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2">
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
        <Field
          label="Phone"
          value={form.phone}
          onChange={(v) => setForm({ ...form, phone: v })}
        />
        <Field
          label="Business"
          value={form.business_name}
          onChange={(v) => setForm({ ...form, business_name: v })}
        />
      </div>
      <div className="mt-3">
        <label className="small-caps text-ink/60">Project details</label>
        <textarea
          value={form.message}
          onChange={(e) => setForm({ ...form, message: e.target.value })}
          rows={3}
          className="mt-2 w-full border border-ink/15 bg-bone px-4 py-3 text-ink placeholder:text-ink/30 focus:outline-none"
          placeholder="Tell us what you need…"
        />
      </div>
      {error && <p className="mt-3 text-sm text-catalyst">{error}</p>}
      <MagneticButton
        type="submit"
        variant="catalyst"
        className="mt-6 w-full"
        disabled={saving}
        aria-label={`Request a ${serviceName} quote`}
      >
        {saving ? "Sending…" : "Send Request"}
        {!saving && <ArrowRight className="h-4 w-4" />}
      </MagneticButton>
    </form>
  );
}

function Field({ label, value, onChange, type = "text", required }) {
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
