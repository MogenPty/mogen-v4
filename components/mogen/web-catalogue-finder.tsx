"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import Script from "next/script";
import type { CatalogueWebPackage } from "@/lib/catalogue/location-offer";
import type { PublicWebPriceChoice } from "./web-price-options";
import type { EnquiryAttribution } from "@/lib/enquiry/enquiry";
import { trackConversion } from "@/lib/rampify-tracker";
import {
  INITIAL_ASSESSMENT,
  assessmentEnquiryMessage,
  recommendAssessmentPackage,
  type AssessmentAnswers,
  type AssessmentPageSize,
  type AssessmentPresence,
  type AssessmentGoal,
  type AssessmentRunMode,
} from "@/lib/catalogue/assessment";

type Accent = "catalyst" | "ink" | "secondary";
const STYLES: Record<Accent, { section: string; badge: string; button: string; text: string; muted: string; border: string }> = {
  catalyst: { section: "bg-catalyst text-white", badge: "text-white", button: "bg-white text-[#171717] hover:bg-white/90", text: "text-white", muted: "text-white/80", border: "border-white/30" },
  ink: { section: "bg-ink text-white", badge: "text-catalyst", button: "bg-catalyst text-white hover:bg-catalyst-hover", text: "text-white", muted: "text-white/75", border: "border-white/25" },
  secondary: { section: "bg-secondary text-ink", badge: "text-catalyst", button: "bg-catalyst text-white hover:bg-catalyst-hover", text: "text-ink", muted: "text-ink/75", border: "border-ink/25" },
};
const TURNSTILE_SITE_KEY = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY ?? "";
const paymentOrder = ["managed_monthly", "managed_annual", "self_hosted", "once_off"];
const needs = [
  ["whatsapp", "WhatsApp enquiry button"],
  ["email", "Business email"],
  ["blog", "Blog or news"],
  ["cms", "Edit website content myself"],
  ["booking", "Online appointments/bookings"],
  ["ecommerce", "Sell products online"],
  ["custom-app", "Custom portal, marketplace or integration"],
] as const;
const zar = (cents: number) => new Intl.NumberFormat("en-ZA", {
  style: "currency", currency: "ZAR", maximumFractionDigits: 0,
}).format(cents / 100);
type ContactState = { name: string; email: string; phone: string; businessName: string; companyWebsite: string };

export default function WebCatalogueFinder({
  packages, prices = [], attribution, accent = "catalyst",
}: Readonly<{
  packages: CatalogueWebPackage[];
  prices?: PublicWebPriceChoice[];
  attribution?: EnquiryAttribution;
  /** Component colour token, defaults to Mogen green. */
  accent?: Accent;
}>) {
  const style = STYLES[accent];
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<AssessmentAnswers>(INITIAL_ASSESSMENT);
  const [contact, setContact] = useState<ContactState>({
    name: "", email: "", phone: "", businessName: "", companyWebsite: "",
  });
  const [token, setToken] = useState("");
  const [error, setError] = useState("");
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const widgetNode = useRef<HTMLDivElement>(null);
  const widgetId = useRef<string | null>(null);
  const heading = useRef<HTMLHeadingElement>(null);
  const recommendation = useMemo(() => recommendAssessmentPackage(packages, answers), [packages, answers]);
  const options = useMemo(() => prices.filter(p => p.packageId === recommendation?.id)
    .sort((a, b) => paymentOrder.indexOf(a.billingMode) - paymentOrder.indexOf(b.billingMode)), [prices, recommendation]);
  const mode = answers.runMode === "unsure" ? "managed_monthly" : answers.runMode;
  const selectedOption = options.find(p => p.billingMode === mode) ?? options[0];
  const priceDescription = selectedOption
    ? `${zar(selectedOption.amountCents)}${selectedOption.billingMode === "managed_monthly" ? "/month" :
        selectedOption.billingMode === "managed_annual" ? "/year" : " once-off"}${selectedOption.setupFeeCents ? ` + ${zar(selectedOption.setupFeeCents)} setup` : ""}`
    : undefined;
  const setField = <K extends keyof AssessmentAnswers>(field: K, value: AssessmentAnswers[K]) =>
    setAnswers(old => ({ ...old, [field]: value }));
  const inputStyle = "mt-2 w-full rounded border border-ink/20 bg-bone px-4 py-3 text-ink focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white";

  function renderWidget() {
    if (!TURNSTILE_SITE_KEY || step !== 2 || sent || !widgetNode.current || !window.turnstile || widgetId.current) return;
    widgetId.current = window.turnstile.render(widgetNode.current, {
      sitekey: TURNSTILE_SITE_KEY, action: "contact", theme: "auto",
      callback: setToken,
      "expired-callback": () => setToken(""),
      "error-callback": () => setToken(""),
    });
  }
  useEffect(() => {
    if (step === 2 && !sent) {
      // If returning to the final step, always create a fresh widget.
      renderWidget();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step, sent]);
  function move(next: number) {
    if (next > 0 && answers.presence !== "none" && answers.website.trim()) {
      const value = answers.website.trim();
      try {
        const url = new URL(value.startsWith("http") ? value : `https://${value}`);
        if (!url.hostname.includes(".")) throw new Error("domain");
      } catch {
        setError("Please enter a valid website address, or leave it blank.");
        return;
      }
    }
    setError("");
    if (widgetId.current !== null && next !== 2) {
      window.turnstile?.reset(widgetId.current);
      widgetId.current = null;
    }
    setStep(next);
    requestAnimationFrame(() => heading.current?.focus());
  }
  function toggleNeed(value: string) {
    setAnswers(prev => ({
      ...prev,
      needs: prev.needs.includes(value) ? prev.needs.filter(n => n !== value) : [...prev.needs, value],
    }));
  }
  async function submit() {
    if (sending) return;
    if (!contact.name.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contact.email.trim())) {
      setError("Please provide your name and a valid email address.");
      return;
    }
    if (!TURNSTILE_SITE_KEY || !token) {
      setError("Please complete the verification check. If unavailable, email info@mogen.co.za.");
      renderWidget();
      return;
    }
    setSending(true);
    setError("");
    try {
      const response = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...contact,
          service: "Web Development",
          package: recommendation?.id ?? "",
          priceOption: selectedOption?.id ?? "",
          otherServiceDetail: "",
          message: assessmentEnquiryMessage(answers, recommendation?.name ?? "consultation", priceDescription),
          attribution: attribution ?? {},
          turnstileToken: token,
        }),
      });
      const result = await response.json() as { ok: boolean; error?: string; fieldErrors?: Record<string, string> };
      if (!response.ok || !result.ok) {
        setError(Object.values(result.fieldErrors ?? {})[0] ?? result.error ?? "Unable to send your enquiry.");
        setToken("");
        if (widgetId.current) window.turnstile?.reset(widgetId.current);
        return;
      }
      trackConversion("contact");
      setSent(true);
    } catch {
      setError("Unable to send your enquiry. Please try again or email info@mogen.co.za.");
      setToken("");
      if (widgetId.current) window.turnstile?.reset(widgetId.current);
    } finally {
      setSending(false);
    }
  }
  return (
    <section id="assessment" className={`px-6 py-20 lg:px-10 lg:py-28 ${style.section}`} aria-labelledby="catalogue-assessment-heading">
      <div className="mx-auto max-w-4xl">
        <p className={`small-caps ${style.badge}`}>Website assessment · Step {step + 1} of 3</p>
        <h2 id="catalogue-assessment-heading" ref={heading} tabIndex={-1} className={`mt-3 font-display text-4xl font-black lg:text-5xl ${style.text}`}>
          {sent ? "Your website enquiry is on its way." : step === 0 ? "Tell us about your business." :
            step === 1 ? "What should your website do?" : "Your recommendation and next steps."}
        </h2>
        <p className={`mt-4 max-w-2xl ${style.muted}`}>
          {sent ? "Mogen will review your requirements and reply within one business day." :
            "Help us understand where your business is now and what you want to achieve. We use your answers to recommend a suitable package and prepare a useful follow-up."}
        </p>
        <div className={`mt-8 flex gap-2`} aria-hidden="true">
          {[0, 1, 2].map(i => <div key={i} className={`h-1.5 flex-1 rounded ${i <= step ? "bg-white" : "bg-white/25"} ${accent === "secondary" && i <= step ? "!bg-catalyst" : ""}`} />)}
        </div>
        {sent ? (
          <div role="status" className={`mt-8 rounded-lg border p-6 ${style.border}`}>
            <p className="text-xl font-bold">Thank you, {contact.name.split(" ")[0]}.</p>
            <p className="mt-2">Your requirements have been submitted to Mogen.</p>
            <Link className="mt-5 inline-block underline" href="/services/web-development#pricing">Compare website packages</Link>
          </div>
        ) : (
          <div className={`mt-8 rounded-xl border p-5 sm:p-8 ${style.border}`}>
            {step === 0 && (
              <div className="grid gap-5 sm:grid-cols-2">
                <div className="sm:col-span-2">
                  <label htmlFor="assessment-presence" className="font-semibold">Do you have a website currently?</label>
                  <select id="assessment-presence" className={inputStyle} value={answers.presence} onChange={e => setField("presence", e.target.value as AssessmentPresence)}>
                    <option value="none">No website yet</option>
                    <option value="needs-work">Yes, but it needs improvement</option>
                    <option value="works-fine">Yes, and it works well</option>
                  </select>
                </div>
                {answers.presence !== "none" && <div className="sm:col-span-2">
                  <label htmlFor="assessment-website" className="font-semibold">Existing website address (optional)</label>
                  <input id="assessment-website" className={inputStyle} type="text" placeholder="example.co.za" value={answers.website} onChange={e => setField("website", e.target.value)} />
                </div>}
                <div>
                  <label htmlFor="assessment-type" className="font-semibold">What type of business?</label>
                  <select id="assessment-type" className={inputStyle} value={answers.businessType} onChange={e => setField("businessType", e.target.value)}>
                    {["services", "retail", "hospitality", "professional", "other"].map(x => <option key={x} value={x}>{x[0].toUpperCase() + x.slice(1)}</option>)}
                  </select>
                </div>
                {answers.businessType === "other" && <div>
                  <label htmlFor="assessment-other-type" className="font-semibold">Describe the business</label>
                  <input id="assessment-other-type" className={inputStyle} value={answers.otherBusinessType} onChange={e => setField("otherBusinessType", e.target.value)} />
                </div>}
                <div>
                  <label htmlFor="assessment-location" className="font-semibold">Where do you operate?</label>
                  <select id="assessment-location" className={inputStyle} value={answers.location} onChange={e => setField("location", e.target.value)}>
                    <option value="">Choose an area (optional)</option>
                    <option value="Maboloka">Maboloka</option>
                    <option value="Soshanguve">Soshanguve</option>
                    <option value="Centurion">Centurion</option>
                    <option value="Elsewhere in South Africa">Elsewhere in South Africa</option>
                    <option value="Outside South Africa">Outside South Africa</option>
                  </select>
                </div>
              </div>
            )}
            {step === 1 && (
              <div className="space-y-6">
                <div>
                  <label htmlFor="assessment-goal" className="font-semibold">What is your main objective?</label>
                  <select id="assessment-goal" className={inputStyle} value={answers.goal} onChange={e => setField("goal", e.target.value as AssessmentGoal)}>
                    <option value="enquiries">Get more customer enquiries</option>
                    <option value="info">Showcase services and business information</option>
                    <option value="sales">Sell products online</option>
                    <option value="bookings">Accept appointments or bookings</option>
                  </select>
                </div>
                <div>
                  <label htmlFor="assessment-size" className="font-semibold">How large a website do you need?</label>
                  <select id="assessment-size" className={inputStyle} value={answers.pageSize} onChange={e => setField("pageSize", e.target.value as AssessmentPageSize)}>
                    <option value="unsure">Not sure yet — help me choose</option>
                    <option value="one">One landing page</option>
                    <option value="small">2–5 pages</option>
                    <option value="medium">6–10 pages</option>
                    <option value="large">11–15 pages</option>
                    <option value="extended">16–25 pages</option>
                    <option value="custom">More than 25 pages / custom platform</option>
                  </select>
                </div>
                <fieldset>
                  <legend className="font-semibold">Which features do you need? (Select any)</legend>
                  <div className="mt-3 grid gap-3 sm:grid-cols-2">
                    {needs.map(([value, label]) => <label key={value} className={`flex items-start gap-3 rounded border p-3 ${style.border}`}>
                      <input type="checkbox" checked={answers.needs.includes(value)} onChange={() => toggleNeed(value)} className="mt-1 accent-white" />
                      {label}
                    </label>)}
                  </div>
                </fieldset>
                <div>
                  <label htmlFor="assessment-payment" className="font-semibold">How would you prefer to pay?</label>
                  <select id="assessment-payment" className={inputStyle} value={answers.runMode} onChange={e => setField("runMode", e.target.value as AssessmentRunMode)}>
                    <option value="unsure">Not sure — recommend a managed option</option>
                    <option value="managed_monthly">Managed Monthly</option>
                    <option value="managed_annual">Managed Annually</option>
                    <option value="self_hosted">Self-Hosted</option>
                  </select>
                </div>
              </div>
            )}
            {step === 2 && (
              <div className="space-y-5">
                {recommendation && <div className={`rounded-lg border p-5 ${style.border}`} aria-live="polite">
                  <p className="small-caps">Recommended starting point</p>
                  <h3 className="mt-2 font-display text-2xl font-black">{recommendation.name}</h3>
                  <p className="mt-2">{recommendation.summary}</p>
                  <p className="mt-2 text-xl font-bold">{priceDescription ?? "Tailored quotation"}</p>
                  <p className={`mt-2 text-sm ${style.muted}`}>The final scope and price are confirmed after reviewing your requirements.</p>
                </div>}
                <p className="font-semibold">Where may we send your recommendation?</p>
                <div className="grid gap-4 sm:grid-cols-2">
                  {([
                    ["name", "Your name", true], ["email", "Email address", true],
                    ["phone", "Phone / WhatsApp", false], ["businessName", "Business name", false],
                  ] as const).map(([field, label, required]) => (
                    <div key={field}>
                      <label htmlFor={`assessment-${field}`} className="font-semibold">{label}{required ? " *" : ""}</label>
                      <input id={`assessment-${field}`} type={field === "email" ? "email" : field === "phone" ? "tel" : "text"}
                        autoComplete={field === "email" ? "email" : field === "name" ? "name" : field === "phone" ? "tel" : "organization"}
                        required={required} className={inputStyle} value={contact[field]}
                        onChange={e => setContact(old => ({ ...old, [field]: e.target.value }))} />
                    </div>
                  ))}
                </div>
                <div className="hidden" aria-hidden="true">
                  <label htmlFor="assessment-honeypot">Company website</label>
                  <input id="assessment-honeypot" type="text" tabIndex={-1} autoComplete="off"
                    value={contact.companyWebsite} onChange={e => setContact(old => ({ ...old, companyWebsite: e.target.value }))} />
                </div>
                <p className={`text-sm ${style.muted}`}>By submitting, you ask Mogen to contact you about your website requirements. We use these details to respond to your enquiry.</p>
                {TURNSTILE_SITE_KEY ? <>
                  <Script src="https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit" strategy="afterInteractive" onReady={renderWidget} />
                  <div ref={widgetNode} className="mt-4" />
                </> : <p role="alert">Verification is unavailable. Please contact info@mogen.co.za.</p>}
              </div>
            )}
            {error && <p role="alert" className="mt-5 rounded border border-white/50 p-3 font-semibold">{error}</p>}
            <div className="mt-8 flex flex-wrap justify-between gap-3">
              {step > 0 ? <button type="button" onClick={() => move(step - 1)} className={`rounded border px-5 py-3 font-semibold ${style.border}`}>Back</button> : <span />}
              {step < 2 ? <button type="button" onClick={() => move(step + 1)} className={`rounded px-6 py-3 font-bold ${style.button}`}>Continue</button> :
                <button type="button" disabled={sending} onClick={submit} className={`rounded px-6 py-3 font-bold disabled:opacity-60 ${style.button}`}>
                  {sending ? "Sending…" : "Send my website requirements"}
                </button>}
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
