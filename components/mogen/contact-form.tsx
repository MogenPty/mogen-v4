"use client";

import { ArrowRight, CheckCircle2 } from "lucide-react";
import Script from "next/script";
import { type FormEvent, useRef, useState } from "react";
import { siteConfig } from "@/data/site";
import { CONTACT_SERVICES } from "@/lib/contact/contact-service";
import type { EnquiryAttribution } from "@/lib/enquiry/enquiry";
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

interface ContactFormProps {
  /**
   * Preselected service display name resolved server-side from
   * `?service=` (or from the promotion's associated service).
   * Absent/unknown values leave the selector empty — a default, not a
   * lock: the selector stays editable.
   */
  initialService?: string;
  /**
   * Editable starter message generated from `?promotion=` data.
   * Used only as the initial value — visitor edits are never
   * overwritten.
   */
  initialMessage?: string;
  /**
   * Display name of the recognised promotion, if any.
   */
  initialPromotionName?: string;
  /**
   * Non-blocking explanation when the promotion adjusted the service
   * selection (e.g. contradictory service + promotion in the URL).
   */
  initialServiceNotice?: string;
  /**
   * Attribution carried through the enquiry journey. Rendered as
   * hidden fields and sent with the submission for later use — never
   * injected into the visitor-facing message.
   */
  initialAttribution?: EnquiryAttribution;
}

export default function ContactForm({
  initialService,
  initialMessage,
  initialPromotionName,
  initialServiceNotice,
  initialAttribution,
}: Readonly<ContactFormProps> = {}) {
  const resolvedService =
    initialService && CONTACT_SERVICES.includes(initialService)
      ? initialService
      : "";
  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
    businessName: "",
    service: resolvedService,
    otherServiceDetail: "",
    message: initialMessage ?? "",
    // Honeypot — hidden from humans, bots fill it in.
    companyWebsite: "",
  });
  const [attribution] = useState<EnquiryAttribution>(initialAttribution ?? {});
  const [saving, setSaving] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState("");
  const [turnstileToken, setTurnstileToken] = useState("");
  const turnstileContainer = useRef<HTMLDivElement>(null);
  const contactWidgetId = useRef<TurnstileWidgetId | null>(null);

  // The single error string doubles as the "Other" field error when it
  // carries the service-detail message (set identically client-side and
  // by server fieldErrors), so it can be associated with its input.
  const isOtherDetailError =
    form.service === "Other" && error === "Please specify your service.";

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
    if (!form.service) {
      setError("Please select a service.");
      return;
    }
    if (form.service === "Other" && !form.otherServiceDetail.trim()) {
      setError("Please specify your service.");
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
        body: JSON.stringify({ ...form, attribution, turnstileToken }),
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
          Service of interest{" "}
          <span className="text-catalyst" aria-hidden="true">
            *
          </span>
          <span className="sr-only"> (required)</span>
        </label>
        <select
          id={"service"}
          name="service"
          value={form.service}
          onChange={(e) =>
            setForm((prev) => ({
              ...prev,
              service: e.target.value,
              // Drop stale hidden data when leaving "Other".
              otherServiceDetail:
                e.target.value === "Other" ? prev.otherServiceDetail : "",
            }))
          }
          required
          aria-required="true"
          className="mt-2 w-full border border-ink/25 bg-ink/5 px-4 py-3 text-ink scheme-light focus:border-catalyst/60 focus:outline-none dark:scheme-dark"
        >
          <option value="" className="bg-bone text-ink">
            Select a service
          </option>
          {CONTACT_SERVICES.map((s) => (
            <option key={s} value={s} className="bg-bone text-ink">
              {s}
            </option>
          ))}
        </select>
        {initialPromotionName && (
          <div className="mt-3 border border-ink/15 bg-ink/5 px-4 py-3 text-sm text-ink/70">
            <p>
              Promotion:{" "}
              <span className="font-semibold text-ink">
                {initialPromotionName}
              </span>
            </p>
            {initialServiceNotice && (
              <p className="mt-1">{initialServiceNotice}</p>
            )}
          </div>
        )}
      </div>
      {form.service === "Other" && (
        <div className="mt-3">
          <label
            htmlFor="contact-service-other"
            className="small-caps text-ink/60"
          >
            If Other, please specify{" "}
            <span className="text-catalyst" aria-hidden="true">
              *
            </span>
            <span className="sr-only"> (required)</span>
          </label>
          <input
            id={"contact-service-other"}
            name="otherServiceDetail"
            type="text"
            value={form.otherServiceDetail}
            onChange={(e) =>
              setForm({ ...form, otherServiceDetail: e.target.value })
            }
            required
            aria-required="true"
            aria-invalid={isOtherDetailError ? true : undefined}
            aria-describedby={
              isOtherDetailError ? "contact-service-other-error" : undefined
            }
            placeholder="e.g. website maintenance, consulting, training"
            className="mt-2 w-full border border-ink/25 bg-ink/5 px-4 py-3 text-ink placeholder:text-ink/30 focus:border-catalyst/60 focus:outline-none"
          />
        </div>
      )}
      <div className="mt-3">
        <label htmlFor="project_details" className="small-caps text-ink/60">
          Project details
        </label>
        <textarea
          id={"project_details"}
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
          id={"company_website"}
          name="companyWebsite"
          type="text"
          tabIndex={-1}
          autoComplete="off"
          value={form.companyWebsite}
          onChange={(e) => setForm({ ...form, companyWebsite: e.target.value })}
        />
      </div>
      {/* Attribution carried through the enquiry (tracking metadata only) */}
      <div className="hidden" aria-hidden="true">
        {Object.entries(attribution).map(([key, value]) => (
          <input
            key={key}
            name={key}
            type="hidden"
            value={value ?? ""}
            readOnly
          />
        ))}
      </div>
      {error && (
        <p
          className="mt-3 text-sm text-catalyst"
          role="alert"
          id={isOtherDetailError ? "contact-service-other-error" : undefined}
        >
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
