"use client";

import { ArrowRight, CheckCircle2 } from "lucide-react";
import Script from "next/script";
import { type FormEvent, useRef, useState } from "react";
import { CONTACT_SERVICES } from "@/lib/contact/contact-service";
import { siteConfig } from "@/data/site";
import MagneticButton from "./magnet-button";

const TURNSTILE_SITE_KEY = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY ?? "";
const TURNSTILE_ACTION = "contact";

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

export default function ContactForm() {
  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
    businessName: "",
    service: "Web Development",
    message: "",
    // Honeypot — hidden from humans, bots fill it in.
    companyWebsite: "",
  });
  const [saving, setSaving] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState("");
  const [turnstileToken, setTurnstileToken] = useState("");
  const turnstileContainer = useRef<HTMLDivElement>(null);
  const contactWidgetId = useRef<TurnstileWidgetId | null>(null);

  function renderTurnstile() {
    if (
      !TURNSTILE_SITE_KEY ||
      !turnstileContainer.current ||
      contactWidgetId.current !== null ||
      typeof window.turnstile === "undefined"
    ) {
      return;
    }
    contactWidgetId.current = window.turnstile.render(
      turnstileContainer.current,
      {
        sitekey: TURNSTILE_SITE_KEY,
        action: TURNSTILE_ACTION,
        theme: "auto",
        callback: setTurnstileToken,
        "expired-callback": () => setTurnstileToken(""),
        "error-callback": () => setTurnstileToken(""),
      },
    );
  }

  function resetTurnstile() {
    if (
      contactWidgetId.current !== null &&
      typeof window.turnstile !== "undefined"
    ) {
      window.turnstile.reset(contactWidgetId.current);
    }
    setTurnstileToken("");
  }

  const submit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!form.name.trim() || !form.email.trim()) {
      setError("Name and email are required.");
      return;
    }
    // Fail closed: no submission without a passing Turnstile check.
    if (!TURNSTILE_SITE_KEY) {
      setError(
        "Verification is not configured right now. Please email info@mogen.co.za directly.",
      );
      return;
    }
    if (!turnstileToken) {
      setError("Please complete the verification check before sending.");
      return;
    }
    setSaving(true);
    setError("");
    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, turnstileToken }),
      });
      const data = (await res.json()) as {
        ok: boolean;
        error?: string;
        fieldErrors?: Record<string, string>;
      };
      if (!res.ok || !data.ok) {
        const firstFieldError = data.fieldErrors
          ? Object.values(data.fieldErrors)[0]
          : undefined;
        setError(
          firstFieldError ??
            data.error ??
            `Something went wrong. Please try again or email ${siteConfig.email}.`,
        );
        // Tokens are single-use: reset so a retry gets a fresh check.
        resetTurnstile();
        setSaving(false);
        return;
      }
      setSaving(false);
      setDone(true);
    } catch {
      setSaving(false);
      resetTurnstile();
      setError(
        `Something went wrong. Please try again or email ${siteConfig.email}.`,
      );
    }
  };

  if (done) {
    return (
      <div className="flex min-h-80 flex-col items-start justify-center">
        <CheckCircle2 className="h-12 w-12 text-catalyst" aria-hidden="true" />
        <h3 className="mt-6 font-display text-3xl font-black text-ink">
          Message received.
        </h3>
        <p className="mt-3 max-w-sm text-ink/70">
          Thanks{form.name ? `, ${form.name.split(" ")[0]}` : ""}. Mogen will
          review your enquiry and reply within one business day with a practical
          next step.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={submit}>
      <h2 className="font-display text-2xl font-black text-ink">
        Send us a message
      </h2>
      <p className="mt-2 text-sm text-ink/60">
        Explain what you need. Mogen will review it and reply within one
        business day with a practical next step.
      </p>
      <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2">
        <Field
          label="Name"
          name="name"
          value={form.name}
          onChange={(v) => setForm({ ...form, name: v })}
          required
          autoComplete="name"
        />
        <Field
          label="Email"
          name="email"
          type="email"
          value={form.email}
          onChange={(v) => setForm({ ...form, email: v })}
          required
          autoComplete="email"
        />
        <Field
          label="Phone"
          name="phone"
          type="tel"
          value={form.phone}
          onChange={(v) => setForm({ ...form, phone: v })}
          autoComplete="tel"
        />
        <Field
          label="Business"
          name="businessName"
          value={form.businessName}
          onChange={(v) => setForm({ ...form, businessName: v })}
          autoComplete="organization"
        />
      </div>
      <div className="mt-3">
        <label htmlFor="service" className="small-caps text-ink/60">
          Service of interest
        </label>
        <select
          id="service"
          name="service"
          value={form.service}
          onChange={(e) => setForm({ ...form, service: e.target.value })}
          className="mt-2 w-full border border-ink/25 bg-ink/5 px-4 py-3 text-ink [color-scheme:light] focus:border-catalyst/60 focus:outline-none dark:[color-scheme:dark]"
        >
          {CONTACT_SERVICES.map((s) => (
            <option key={s} value={s} className="bg-bone text-ink">
              {s}
            </option>
          ))}
        </select>
      </div>
      <div className="mt-3">
        <label htmlFor="project_details" className="small-caps text-ink/60">
          Project details
        </label>
        <textarea
          id="project_details"
          name="message"
          value={form.message}
          onChange={(e) => setForm({ ...form, message: e.target.value })}
          rows={4}
          className="mt-2 w-full border border-ink/25 bg-ink/5 px-4 py-3 text-ink placeholder:text-ink/30 focus:border-catalyst/60 focus:outline-none"
          placeholder="Tell us what you need…"
        />
      </div>
      {/* Honeypot — invisible to humans */}
      <div className="hidden" aria-hidden="true">
        <label htmlFor="company_website">Company website</label>
        <input
          id="company_website"
          name="companyWebsite"
          type="text"
          tabIndex={-1}
          autoComplete="off"
          value={form.companyWebsite}
          onChange={(e) => setForm({ ...form, companyWebsite: e.target.value })}
        />
      </div>
      {error && (
        <p className="mt-3 text-sm text-catalyst" role="alert">
          {error}
        </p>
      )}
      {TURNSTILE_SITE_KEY ? (
        <>
          <Script
            src="https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit"
            strategy="afterInteractive"
            onReady={renderTurnstile}
          />
          <div ref={turnstileContainer} className="mt-6" />
        </>
      ) : (
        <p className="mt-6 text-sm text-catalyst" role="alert">
          Verification is not configured right now. Please email
          info@mogen.co.za directly.
        </p>
      )}
      <MagneticButton
        type="submit"
        variant="catalyst"
        className="mt-6 w-full"
        disabled={saving}
        aria-label="Send message"
      >
        {saving ? "Sending…" : "Send Message"}
        {!saving && <ArrowRight className="h-4 w-4" />}
      </MagneticButton>
    </form>
  );
}

interface FieldProps {
  label: string;
  name: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  required?: boolean;
  autoComplete?: string;
}

function Field({
  label,
  name,
  value,
  onChange,
  type = "text",
  required,
  autoComplete,
}: Readonly<FieldProps>) {
  const id = `contact-${name}`;
  return (
    <div>
      <label htmlFor={id} className="small-caps text-ink/60">
        {label}
        {required && <span className="text-catalyst"> *</span>}
      </label>
      <input
        id={id}
        name={name}
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        autoComplete={autoComplete}
        required={required}
        className="mt-2 w-full border border-ink/25 bg-ink/5 px-4 py-3 text-ink placeholder:text-ink/30 focus:border-catalyst/60 focus:outline-none"
      />
    </div>
  );
}
