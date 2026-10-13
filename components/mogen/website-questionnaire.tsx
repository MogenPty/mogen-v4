"use client";

import { AlertTriangle, ArrowLeft, ArrowRight, CheckCircle2 } from "lucide-react";
import Script from "next/script";
import { useEffect, useMemo, useRef, useState } from "react";
import { getService } from "@/data/services";
import type { Promotion } from "@/data/promotions";
import type { EnquiryAttribution } from "@/lib/enquiry/enquiry";
import { withAttribution } from "@/lib/enquiry/enquiry";
import { formatNumber } from "@/lib/utils";
import {
  buildWebsiteEnquiryPayload,
  canProceed,
  DEFAULT_REQUIREMENTS,
  EMPTY_CONTACT,
  QUESTIONNAIRE_STEPS,
  validateContact,
  validateWebsiteUrl,
  WEBSITE_ASSESSMENT_ANCHOR,
  type QuestionnaireContact,
} from "@/lib/web-requirements/questionnaire";
import {
  promotionPriceLines,
  resolveDisplayPromotion,
} from "@/lib/web-requirements/promotion-pricing";
import {
  recommendPackage,
  recommendationPriceDisplay,
} from "@/lib/web-requirements/recommendation";
import type {
  BusinessLocation,
  BusinessPresence,
  BusinessType,
  PageSize,
  RunPreference,
  WebsiteGoal,
  WebsiteNeed,
  WebsiteRequirements,
} from "@/lib/web-requirements/recommendation";
import BlueprintGrid from "./blueprint-grid";
import MagneticButton from "./magnet-button";

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
  /** Attribution carried from the homepage URL (utm_* only). */
  initialAttribution?: EnquiryAttribution;
  /**
   * Active promotions resolved server-side (already date-filtered).
   * When one targets the recommended package, its price points replace
   * the standard display — eligibility is confirmed by Mogen on enquiry.
   */
  promotions?: Promotion[];
}

const GOAL_OPTIONS: { value: WebsiteGoal; label: string }[] = [
  { value: "enquiries", label: "Getting enquiries" },
  { value: "sales", label: "Selling online" },
  { value: "bookings", label: "Taking bookings" },
  { value: "info", label: "Sharing information" },
];

const PRESENCE_OPTIONS: { value: BusinessPresence; label: string }[] = [
  { value: "none", label: "No website yet" },
  { value: "needs-work", label: "Have one, but it needs work" },
  { value: "works-fine", label: "Have one that works fine" },
];

const TYPE_OPTIONS: { value: BusinessType; label: string }[] = [
  { value: "services", label: "Services" },
  { value: "retail", label: "Retail" },
  { value: "hospitality", label: "Hospitality" },
  { value: "professional", label: "Professional" },
  { value: "other", label: "Other" },
];

const PAGE_OPTIONS: { value: PageSize; label: string; hint: string }[] = [
  { value: "starter", label: "Starter", hint: "Roughly 1–5 pages" },
  { value: "growing", label: "Growing", hint: "Roughly 6–15 pages" },
  { value: "large", label: "Large", hint: "16+ pages" },
  { value: "unsure", label: "Not sure yet", hint: "We will guide you" },
];

const NEED_OPTIONS: { value: WebsiteNeed; label: string }[] = [
  { value: "ecommerce", label: "Sell products online" },
  { value: "booking", label: "Online bookings or appointments" },
  { value: "blog", label: "Blog or news section" },
  { value: "cms", label: "Update content myself" },
  { value: "email", label: "Email accounts with my domain" },
  { value: "whatsapp", label: "WhatsApp enquiry button" },
  {
    value: "custom-app",
    label: "Something custom (marketplace, portal, integrations)",
  },
];

const RUN_OPTIONS: { value: RunPreference; label: string }[] = [
  { value: "managed", label: "Managed — hosting and maintenance handled" },
  { value: "once-off", label: "Once-off — I handle running it" },
  { value: "unsure", label: "Not sure yet" },
];

const LOCATION_OPTIONS: { value: BusinessLocation; label: string }[] = [
  { value: "maboloka", label: "Maboloka" },
  { value: "soshanguve", label: "Soshanguve" },
  { value: "pretoria", label: "Pretoria / Tshwane" },
  { value: "elsewhere-sa", label: "Elsewhere in South Africa" },
  { value: "outside-sa", label: "Outside South Africa" },
];

export default function WebsiteQuestionnaire({
  numbering = 1,
  initialAttribution,
  promotions,
}: Readonly<Props>) {
  const [step, setStep] = useState(0);
  const [contact, setContact] = useState<QuestionnaireContact>(EMPTY_CONTACT);
  const [requirements, setRequirements] =
    useState<WebsiteRequirements>(DEFAULT_REQUIREMENTS);
  const [attribution] = useState<EnquiryAttribution>(initialAttribution ?? {});
  const [fieldErrors, setFieldErrors] = useState<{
    name?: string;
    email?: string;
  }>({});
  const [gateError, setGateError] = useState("");
  const [businessErrors, setBusinessErrors] = useState<{ website?: string }>(
    {},
  );
  const [turnstileToken, setTurnstileToken] = useState("");
  const [saving, setSaving] = useState(false);
  const [done, setDone] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const headingRef = useRef<HTMLHeadingElement>(null);
  const turnstileContainer = useRef<HTMLDivElement>(null);
  const turnstileSlot = useRef<WidgetSlot>({ id: null, el: null });

  const recommendation = useMemo(
    () => recommendPackage(requirements),
    [requirements],
  );
  const webPricing = useMemo(
    () => getService("web-development")?.pricing ?? [],
    [],
  );
  const recommendedPricing = recommendation.packageId
    ? webPricing.find((p) => p.packageId === recommendation.packageId)
    : undefined;
  // Display price follows the billing mode: owner-confirmed once-off
  // figures for self-hosted builds, documented subscription pricing
  // otherwise. Features always come from the documented package scope.
  const priceDisplay = recommendationPriceDisplay(recommendation);
  // An active promotion targeting the recommended package replaces the
  // standard display with its own price points (from promotion data) —
  // but only for managed billing: subscription promos never apply to
  // self-hosted once-off builds.
  const appliedPromotion = resolveDisplayPromotion(promotions, recommendation);
  const promotionLines = appliedPromotion
    ? promotionPriceLines(appliedPromotion)
    : [];

  const totalSteps = QUESTIONNAIRE_STEPS.length;

  function goTo(next: number) {
    // Contact details gate every later step.
    if (next > 0 && !canProceed(QUESTIONNAIRE_STEPS[next].id, contact)) {
      setFieldErrors(validateContact(contact));
      setGateError("Please add your name and email first.");
      return;
    }
    setGateError("");
    setStep(next);
    // Move keyboard focus to the new step heading.
    requestAnimationFrame(() => headingRef.current?.focus());
  }

  function nextFromContact() {
    const errors = validateContact(contact);
    setFieldErrors(errors);
    if (Object.keys(errors).length > 0) {
      setGateError("Please fix the highlighted fields to continue.");
      return;
    }
    setGateError("");
    goTo(1);
  }

  function nextFromBusiness() {
    // The website address is optional, but a provided value must be valid.
    const websiteError = validateWebsiteUrl(requirements.website);
    setBusinessErrors(websiteError ? { website: websiteError } : {});
    if (websiteError) {
      setGateError("Please fix the highlighted field to continue.");
      return;
    }
    setGateError("");
    goTo(2);
  }

  function toggleNeed(need: WebsiteNeed) {
    setRequirements((prev) => ({
      ...prev,
      needs: prev.needs.includes(need)
        ? prev.needs.filter((n) => n !== need)
        : [...prev.needs, need],
    }));
  }

  function renderWidget() {
    if (
      !TURNSTILE_SITE_KEY ||
      !turnstileContainer.current ||
      typeof window.turnstile === "undefined"
    ) {
      return;
    }
    // A stored ID is only proof for the container it was rendered into:
    // step changes unmount/remount the container, which needs a fresh widget.
    if (
      turnstileSlot.current.id !== null &&
      turnstileSlot.current.el === turnstileContainer.current
    ) {
      return;
    }
    turnstileSlot.current = {
      id: window.turnstile.render(turnstileContainer.current, {
        sitekey: TURNSTILE_SITE_KEY,
        action: "contact",
        theme: "auto",
        callback: setTurnstileToken,
        "expired-callback": () => setTurnstileToken(""),
        "error-callback": () => setTurnstileToken(""),
      }),
      el: turnstileContainer.current,
    };
  }

  function resetWidget() {
    try {
      if (
        turnstileSlot.current.id !== null &&
        typeof window.turnstile !== "undefined"
      ) {
        window.turnstile.reset(turnstileSlot.current.id);
      }
    } catch {
      // Detached widget (container unmounted) — a fresh render follows on remount.
    }
    setTurnstileToken("");
  }

  // The recommendation step mounts/unmounts with navigation — render the
  // widget whenever the step is visible, not only when the Turnstile
  // script first reports ready, so leaving and returning can never leave
  // an empty widget slot behind.
  useEffect(() => {
    if (step === QUESTIONNAIRE_STEPS.length - 1 && !done) {
      renderWidget();
    }
    // biome-ignore lint/correctness/useExhaustiveDependencies: render-once-per-step-mount only
  }, [step, done]);

  const submit = async () => {
    if (!TURNSTILE_SITE_KEY) {
      setSubmitError(
        "Verification is not configured right now. Please email info@mogen.co.za directly.",
      );
      return;
    }
    if (!turnstileToken) {
      // The widget must be visible whenever verification is required:
      // re-render in case the script was still loading or the slot was
      // remounted, then bring it into view with the error.
      renderWidget();
      turnstileContainer.current?.scrollIntoView({
        behavior: "smooth",
        block: "center",
      });
      setSubmitError("Please complete the verification check before sending.");
      return;
    }
    setSaving(true);
    setSubmitError("");
    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        signal: AbortSignal.timeout(120_000),
        body: JSON.stringify({
          ...buildWebsiteEnquiryPayload({
            contact,
            requirements,
            recommendation,
            attribution,
            promotionName: appliedPromotion?.name,
          }),
          turnstileToken,
        }),
      });
      let data: {
        ok: boolean;
        error?: string;
        fieldErrors?: Record<string, string>;
      };
      try {
        data = (await res.json()) as typeof data;
      } catch {
        throw new Error("unparseable");
      }
      // Only a confirmed server success counts as submitted.
      if (!res.ok || !data.ok) {
        const firstFieldError = data.fieldErrors
          ? Object.values(data.fieldErrors)[0]
          : undefined;
        throw new Error(
          firstFieldError ??
            data.error ??
            "Something went wrong. Please try again or email info@mogen.co.za.",
        );
      }
      setSaving(false);
      setDone(true);
    } catch (err) {
      setSaving(false);
      resetWidget();
      setSubmitError(
        err instanceof Error && err.message !== "unparseable"
          ? err.message
          : "Something went wrong. Please try again or email info@mogen.co.za.",
      );
    }
  };

  return (
    <BlueprintGrid
      id={WEBSITE_ASSESSMENT_ANCHOR}
      className="bg-ink dark:bg-secondary py-24 text-white dark:text-secondary-foreground lg:py-32"
    >
      <div className="mx-auto max-w-[1600px] px-6 lg:px-10">
        <div className="mb-10 flex items-center gap-4">
          <span className="small-caps text-catalyst">
            {`// ${formatNumber(numbering)} — Website Guide`}
          </span>
          <span
            className="h-px flex-1 max-w-30 bg-white/30 dark:bg-secondary-foreground/30"
            aria-hidden="true"
          />
          <span className="small-caps text-white/70 dark:text-secondary-foreground/70">
            Find Your Package
          </span>
        </div>

        <div className="grid grid-cols-1 gap-12 lg:grid-cols-2 lg:gap-20">
          {/* LEFT — copy + progress */}
          <div>
            <h2 className="font-display text-4xl font-black leading-[1.05] lg:text-6xl text-balance">
              Which website
              <br />
              <span className="text-catalyst">fits your business?</span>
            </h2>
            <p className="mt-6 max-w-md text-lg text-white/70 dark:text-secondary-foreground/70">
              Answer five quick questions about your business and website
              needs. You will get a clear package recommendation — Seed,
              Sprout or Vegetative — and can send it straight to Mogen as an
              enquiry.
            </p>

            <ol className="mt-10 flex flex-wrap items-center gap-2">
              {QUESTIONNAIRE_STEPS.map((s, i) => (
                <li key={s.id} className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => goTo(i)}
                    disabled={
                      i > step &&
                      !canProceed(QUESTIONNAIRE_STEPS[i].id, contact)
                    }
                    aria-current={i === step ? "step" : undefined}
                    aria-label={`Go to step ${i + 1}: ${s.label}`}
                    className={
                      "flex h-7 items-center justify-center rounded-full px-3 small-caps transition-colors " +
                      (i === step
                        ? "bg-catalyst text-black"
                        : i < step
                          ? "bg-white/20 dark:bg-secondary-foreground/20 text-white dark:text-secondary-foreground"
                          : "bg-white/10 dark:bg-secondary-foreground/10 text-white/70 dark:text-secondary-foreground/70")
                    }
                  >
                    {s.label}
                  </button>
                  {i < QUESTIONNAIRE_STEPS.length - 1 && (
                    <span
                      className="h-px w-6 bg-white/20 dark:bg-secondary-foreground/20"
                      aria-hidden="true"
                    />
                  )}
                </li>
              ))}
            </ol>
            <p className="mt-4 text-xs text-white/60 dark:text-secondary-foreground/60" role="status">
              Step {step + 1} of {totalSteps} — {QUESTIONNAIRE_STEPS[step].label}.
              Your answers are kept when you move between steps.
            </p>
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

            {done ? (
              <div className="flex min-h-70 flex-col items-start justify-center">
                <CheckCircle2
                  className="h-12 w-12 text-catalyst"
                  aria-hidden="true"
                />
                <h3
                  ref={headingRef}
                  tabIndex={-1}
                  className="mt-6 font-display text-3xl font-black focus:outline-none"
                >
                  Request received.
                </h3>
                <p className="mt-3 max-w-sm text-white/70 dark:text-secondary-foreground/70">
                  Thanks
                  {contact.name ? `, ${contact.name.split(" ")[0]}` : ""}.
                  Mogen will review your requirements
                  {recommendation.packageId
                    ? ` (${recommendation.packageId})`
                    : ""}
                  {" "}and reply within one business day with a practical next
                  step.
                </p>
                <MagneticButton
                  as="a"
                  href={withAttribution(
                    "/services/web-development#pricing",
                    attribution,
                  )}
                  variant="catalyst"
                  className="mt-8 w-full text-black hover:bg-ink hover:text-white dark:hover:text-black"
                >
                  Compare Web Packages <ArrowRight className="h-4 w-4" />
                </MagneticButton>
              </div>
            ) : (
              <div>
                <h3
                  ref={headingRef}
                  tabIndex={-1}
                  className="font-display text-2xl font-black focus:outline-none"
                >
                  {QUESTIONNAIRE_STEPS[step].label}
                </h3>

                {step === 0 && (
                  <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <TextField
                      label="Name"
                      value={contact.name}
                      onChange={(v) => setContact({ ...contact, name: v })}
                      autoComplete="name"
                      required
                      error={fieldErrors.name}
                    />
                    <TextField
                      label="Email"
                      type="email"
                      value={contact.email}
                      onChange={(e) => setContact({ ...contact, email: e })}
                      autoComplete="email"
                      required
                      error={fieldErrors.email}
                    />
                    <TextField
                      label="Phone (optional)"
                      type="tel"
                      value={contact.phone}
                      onChange={(v) => setContact({ ...contact, phone: v })}
                      autoComplete="tel"
                    />
                    <TextField
                      label="Business (optional)"
                      value={contact.businessName}
                      onChange={(v) =>
                        setContact({ ...contact, businessName: v })
                      }
                      autoComplete="organization"
                    />
                    {/* Honeypot — invisible to humans */}
                    <div className="hidden" aria-hidden="true">
                      <label htmlFor="wq-company-website">
                        Company website
                      </label>
                      <input
                        id="wq-company-website"
                        name="companyWebsite"
                        type="text"
                        tabIndex={-1}
                        autoComplete="off"
                        value={contact.companyWebsite}
                        onChange={(e) =>
                          setContact({
                            ...contact,
                            companyWebsite: e.target.value,
                          })
                        }
                      />
                    </div>
                  </div>
                )}

                {step === 1 && (
                  <div className="mt-6 space-y-6">
                    <OptionGroup
                      legend="What is your main goal for the website?"
                      name="wq-goal"
                      options={GOAL_OPTIONS}
                      value={requirements.goal}
                      onChange={(v) =>
                        setRequirements({ ...requirements, goal: v })
                      }
                    />
                    <OptionGroup
                      legend="Do you have a website already?"
                      name="wq-presence"
                      options={PRESENCE_OPTIONS}
                      value={requirements.presence}
                      onChange={(v) =>
                        setRequirements({ ...requirements, presence: v })
                      }
                    />
                    {(requirements.presence === "needs-work" ||
                      requirements.presence === "works-fine") && (
                      <TextField
                        label="Website address (optional)"
                        value={requirements.website}
                        onChange={(v) =>
                          setRequirements({ ...requirements, website: v })
                        }
                        autoComplete="url"
                        error={businessErrors.website}
                      />
                    )}
                    <OptionGroup
                      legend="What kind of business is it?"
                      name="wq-type"
                      options={TYPE_OPTIONS}
                      value={requirements.businessType}
                      onChange={(v) =>
                        setRequirements({ ...requirements, businessType: v })
                      }
                    />
                    {requirements.businessType === "other" && (
                      <TextField
                        label="What kind of business? (optional)"
                        value={requirements.otherBusinessType}
                        onChange={(v) =>
                          setRequirements({
                            ...requirements,
                            otherBusinessType: v,
                          })
                        }
                      />
                    )}
                  </div>
                )}

                {step === 2 && (
                  <div className="mt-6 space-y-6">
                    <fieldset>
                      <legend className="small-caps text-white/70 dark:text-secondary-foreground/70">
                        Roughly how many pages do you need?
                      </legend>
                      <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
                        {PAGE_OPTIONS.map((o) => (
                          <Choice
                            key={o.value}
                            name="wq-pages"
                            checked={requirements.pageSize === o.value}
                            onChange={() =>
                              setRequirements({
                                ...requirements,
                                pageSize: o.value,
                              })
                            }
                          >
                            <span className="font-semibold">{o.label}</span>
                            <span className="text-white/60 dark:text-secondary-foreground/60">
                              {" — "}
                              {o.hint}
                            </span>
                          </Choice>
                        ))}
                      </div>
                    </fieldset>
                    <fieldset>
                      <legend className="small-caps text-white/70 dark:text-secondary-foreground/70">
                        What should the website do? (pick all that apply)
                      </legend>
                      <div className="mt-3 grid grid-cols-1 gap-2">
                        {NEED_OPTIONS.map((o) => (
                          <Choice
                            key={o.value}
                            multiple
                            name={`wq-need-${o.value}`}
                            checked={requirements.needs.includes(o.value)}
                            onChange={() => toggleNeed(o.value)}
                          >
                            {o.label}
                          </Choice>
                        ))}
                      </div>
                    </fieldset>
                    <OptionGroup
                      legend="How do you want to run the site?"
                      name="wq-run"
                      options={RUN_OPTIONS}
                      value={requirements.runPreference}
                      onChange={(v) =>
                        setRequirements({ ...requirements, runPreference: v })
                      }
                    />
                  </div>
                )}

                {step === 3 && (
                  <div className="mt-6">
                    <OptionGroup
                      legend="Where are your business and visitors based?"
                      name="wq-location"
                      options={LOCATION_OPTIONS}
                      value={requirements.location}
                      onChange={(v) =>
                        setRequirements({ ...requirements, location: v })
                      }
                    />
                    <p className="mt-4 text-sm text-white/60 dark:text-secondary-foreground/60">
                      Mogen is based in Maboloka and serves Pretoria,
                      Soshanguve and businesses across South Africa.
                    </p>
                  </div>
                )}

                {step === 4 && (
                  <div className="mt-6">
                    {recommendation.needsConsultation ? (
                      <div>
                        <p className="small-caps text-catalyst">
                          Recommendation — Consultation
                        </p>
                        <h4 className="mt-2 font-display text-3xl font-black">
                          Let&apos;s scope it together.
                        </h4>
                        <ul className="mt-4 space-y-2 text-sm text-white/80 dark:text-secondary-foreground/80">
                          {recommendation.reasons.map((r) => (
                            <li key={r} className="flex items-start gap-2">
                              <CheckCircle2
                                className="mt-0.5 h-4 w-4 shrink-0 text-catalyst"
                                aria-hidden="true"
                              />
                              <span>{r}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    ) : (
                      <div>
                        <p className="small-caps text-catalyst">
                          Recommendation — {recommendedPricing?.name}
                        </p>
                        {appliedPromotion ? (
                          <div className="mt-4 border border-catalyst/60 bg-catalyst/10 px-4 py-4">
                            <p className="font-display text-lg font-black text-white dark:text-secondary-foreground">
                              Promotion — {appliedPromotion.name}
                            </p>
                            <ul className="mt-3 space-y-2 text-sm text-white/80 dark:text-secondary-foreground/80">
                              {promotionLines.map((line) => (
                                <li
                                  key={line.label}
                                  className="flex flex-wrap items-baseline gap-x-2"
                                >
                                  <span className="font-semibold text-catalyst">
                                    {line.price}
                                  </span>
                                  {line.regular && (
                                    <s className="text-white/50 dark:text-secondary-foreground/50">
                                      {line.regular}
                                    </s>
                                  )}
                                  <span>{line.label}</span>
                                </li>
                              ))}
                            </ul>
                            <p className="mt-3 text-xs text-white/60 dark:text-secondary-foreground/60">
                              Promotional pricing subject to eligibility and
                              availability — confirmed in your enquiry.
                            </p>
                          </div>
                        ) : (
                          <>
                            <div className="mt-2 flex items-end gap-2">
                              <span className="font-display text-5xl font-black text-catalyst">
                                {priceDisplay?.price}
                              </span>
                              <span className="mb-2 text-white/70 dark:text-secondary-foreground/70">
                                {priceDisplay?.cadence}
                              </span>
                            </div>
                            {recommendation.billing === "once-off" && (
                              <p className="mt-2 text-sm text-white/60 dark:text-secondary-foreground/60">
                                Once-off build — you host and run it yourself.
                                Final inclusions confirmed in your enquiry.
                              </p>
                            )}
                          </>
                        )}
                        <p className="mt-3 text-xs text-white/60 dark:text-secondary-foreground/60">
                          A 50% deposit is required before work commences.
                        </p>
                        <ul className="mt-4 space-y-2 text-sm text-white/80 dark:text-secondary-foreground/80">
                          {recommendedPricing?.features.map((f) => (
                            <li key={f} className="flex items-start gap-2">
                              <CheckCircle2
                                className="mt-0.5 h-4 w-4 shrink-0 text-catalyst"
                                aria-hidden="true"
                              />
                              <span>{f}</span>
                            </li>
                          ))}
                        </ul>
                        <div className="mt-4 border-t border-white/20 pt-4">
                          <p className="small-caps text-white/60 dark:text-secondary-foreground/60">
                            Why this fits
                          </p>
                          <ul className="mt-2 space-y-2 text-sm text-white/80 dark:text-secondary-foreground/80">
                            {recommendation.reasons.map((r) => (
                              <li key={r}>{r}</li>
                            ))}
                          </ul>
                          {recommendation.reviewNote && (
                            <p
                              className="mt-3 border border-catalyst/60 bg-catalyst/10 px-4 py-3 text-sm text-white/80 dark:text-secondary-foreground/80"
                              role="note"
                            >
                              {recommendation.reviewNote}
                            </p>
                          )}
                        </div>
                      </div>
                    )}

                    {TURNSTILE_SITE_KEY ? (
                      <>
                        <Script
                          src="https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit"
                          strategy="afterInteractive"
                          onReady={renderWidget}
                        />
                        <div ref={turnstileContainer} className="mt-6" />
                      </>
                    ) : (
                      <FormAlert className="mt-6">
                        Verification is not configured right now. Please email
                        info@mogen.co.za directly.
                      </FormAlert>
                    )}
                    {submitError && (
                      <FormAlert className="mt-3">{submitError}</FormAlert>
                    )}
                    <MagneticButton
                      onClick={submit}
                      variant="catalyst"
                      className="mt-4 w-full text-black hover:bg-ink hover:text-white dark:hover:text-black"
                      disabled={saving}
                      aria-label="Send my website requirements to Mogen"
                    >
                      {saving
                        ? "Sending…"
                        : "Send My Requirements to Mogen"}
                      {!saving && <ArrowRight className="h-4 w-4" />}
                    </MagneticButton>
                    <MagneticButton
                      as="a"
                      href={withAttribution(
                        "/services/web-development#pricing",
                        attribution,
                      )}
                      variant="outline"
                      className="mt-3 w-full border-white/40 text-white hover:bg-white hover:text-ink dark:border-secondary-foreground/40 dark:text-secondary-foreground dark:hover:bg-secondary-foreground dark:hover:text-secondary"
                    >
                      Compare all packages first
                    </MagneticButton>
                  </div>
                )}

                {gateError && (
                  <FormAlert className="mt-4">{gateError}</FormAlert>
                )}

                {step < 4 && (
                  <div className="mt-8 flex items-center justify-between gap-3">
                    <MagneticButton
                      onClick={() => goTo(step - 1)}
                      variant="outline"
                      className="border-white/40 text-white hover:bg-white hover:text-ink dark:border-secondary-foreground/40 dark:text-secondary-foreground dark:hover:bg-secondary-foreground dark:hover:text-secondary"
                      disabled={step === 0}
                      aria-label="Go back one step"
                    >
                      <ArrowLeft className="h-4 w-4" /> Back
                    </MagneticButton>
                    {step === 0 ? (
                      <MagneticButton
                        onClick={nextFromContact}
                        variant="catalyst"
                        className="text-black hover:bg-ink hover:text-white dark:hover:text-black"
                      >
                        Continue <ArrowRight className="h-4 w-4" />
                      </MagneticButton>
                    ) : (
                      <MagneticButton
                        onClick={() =>
                          step === 1 ? nextFromBusiness() : goTo(step + 1)
                        }
                        variant="catalyst"
                        className="text-black hover:bg-ink hover:text-white dark:hover:text-black"
                      >
                        {step === 3 ? "See Recommendation" : "Continue"}{" "}
                        <ArrowRight className="h-4 w-4" />
                      </MagneticButton>
                    )}
                  </div>
                )}
                {step === 4 && !done && (
                  <div className="mt-8">
                    <MagneticButton
                      onClick={() => goTo(1)}
                      variant="outline"
                      className="w-full border-white/40 text-white hover:bg-white hover:text-ink dark:border-secondary-foreground/40 dark:text-secondary-foreground dark:hover:bg-secondary-foreground dark:hover:text-secondary"
                      disabled={saving}
                      aria-label="Go back and edit answers"
                    >
                      <ArrowLeft className="h-4 w-4" /> Edit my answers
                    </MagneticButton>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
        <p className="mt-8 text-xs text-white/40">
          Recommendations follow Mogen&apos;s documented Seed, Sprout and
          Vegetative package scope. Anything beyond that scope is flagged for
          a tailored consultation — never forced into a package.
        </p>
      </div>
    </BlueprintGrid>
  );
}

/**
 * Red error alert for the questionnaire panel. Errors use the theme's
 * destructive (red) token — never the green catalyst accent — with an
 * icon, border and `role="alert"` so failures are unmistakable both
 * visually and to assistive technology.
 */
function FormAlert({
  className,
  children,
}: Readonly<{ className?: string; children: React.ReactNode }>) {
  return (
    <p
      role="alert"
      className={
        "flex items-start gap-2 border border-destructive/60 bg-destructive/10 px-4 py-3 text-sm text-destructive " +
        (className ?? "")
      }
    >
      <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
      <span>{children}</span>
    </p>
  );
}

interface TextFieldProps {  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  autoComplete?: string;
  required?: boolean;
  error?: string;
}

function TextField({
  label,
  value,
  onChange,
  type = "text",
  autoComplete,
  required,
  error,
}: Readonly<TextFieldProps>) {
  const id = `wq-${label.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`;
  const errorId = `${id}-error`;
  return (
    <div>
      <label
        htmlFor={id}
        className="small-caps text-white/70 dark:text-secondary-foreground/70"
      >
        {label}
        {required && <span className="text-catalyst"> *</span>}
      </label>
      <input
        id={id}
        name={id}
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        autoComplete={autoComplete}
        required={required}
        aria-required={required ? true : undefined}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? errorId : undefined}
        className="mt-2 w-full border border-white/30 bg-white/5 px-4 py-3 text-white placeholder:text-white/60 focus:outline-none dark:border-secondary-foreground/40 dark:bg-secondary-foreground/10 dark:text-secondary-foreground dark:placeholder:text-secondary-foreground/60"
      />
      {error && (
        <p id={errorId} className="mt-1 text-sm text-destructive" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}

interface OptionGroupProps<T extends string> {
  legend: string;
  name: string;
  options: { value: T; label: string }[];
  value: T;
  onChange: (v: T) => void;
}

function OptionGroup<T extends string>({
  legend,
  name,
  options,
  value,
  onChange,
}: Readonly<OptionGroupProps<T>>) {
  return (
    <fieldset>
      <legend className="small-caps text-white/70 dark:text-secondary-foreground/70">
        {legend}
      </legend>
      <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
        {options.map((o) => (
          <Choice
            key={o.value}
            name={name}
            checked={value === o.value}
            onChange={() => onChange(o.value)}
          >
            {o.label}
          </Choice>
        ))}
      </div>
    </fieldset>
  );
}

interface ChoiceProps {
  name: string;
  checked: boolean;
  onChange: () => void;
  multiple?: boolean;
  children: React.ReactNode;
}

function Choice({
  name,
  checked,
  onChange,
  multiple = false,
  children,
}: Readonly<ChoiceProps>) {
  return (
    <label
      className={
        "flex cursor-pointer items-start gap-3 border px-4 py-3 text-sm transition-colors " +
        (checked
          ? "border-catalyst bg-catalyst/10 text-white dark:text-secondary-foreground"
          : "border-white/30 bg-white/5 text-white/80 hover:border-white/60 dark:border-secondary-foreground/40 dark:bg-secondary-foreground/10 dark:text-secondary-foreground/80")
      }
    >
      <input
        type={multiple ? "checkbox" : "radio"}
        name={name}
        checked={checked}
        onChange={onChange}
        className="mt-0.5 h-4 w-4 shrink-0 accent-catalyst"
      />
      <span>{children}</span>
    </label>
  );
}
