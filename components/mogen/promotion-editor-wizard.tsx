"use client";

import { useActionState, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { adminCardClass, adminFieldClass, adminLabelClass, adminPrimaryClass } from "@/components/mogen/admin-card";
import MogenSelect from "@/components/mogen/mogen-select";
import {
  savePromotionWizardStepAction,
  type PromotionWizardState,
  type PromotionWizardStep,
} from "@/lib/admin/catalogue-actions";
import type { BillingMode } from "@/lib/catalogue/commercial";

export type PromotionTargetDraft = {
  packagePriceId: string;
  appliesTo: "recurring" | "setup" | "project";
  discountKind: "fixed" | "percent";
  discountValue: string;
  discountedMonths: string;
};

export type PromotionEditorValues = {
  name: string;
  sortOrder: string;
  description: string;
  shortDescription: string;
  ctaLabel: string;
  locationSlug: string;
  maximumCustomers: string;
  pricingPackageId: string;
  targets: PromotionTargetDraft[];
  terms: string;
  eligibility: string;
  included: string;
  startsAt: string;
  endsAt: string;
  isFeatured: boolean;
  status: "draft" | "scheduled" | "active" | "expired" | "archived";
};

type PriceOption = {
  id: string;
  packageId: string;
  packageName: string;
  billingMode: BillingMode;
  amountCents: number;
  setupFeeCents: number | null;
};
type WizardMode = "create" | "edit";

const steps: Array<{ id: PromotionWizardStep; label: string; description: string }> = [
  { id: "details", label: "Details", description: "Campaign content and audience" },
  { id: "pricing", label: "Offer", description: "Package, price and discount" },
  { id: "terms", label: "Terms", description: "Conditions and inclusions" },
  { id: "publication", label: "Publish", description: "Schedule and status" },
];

const paymentLabels: Record<BillingMode, string> = {
  managed_monthly: "Managed Monthly",
  managed_annual: "Managed Annually",
  self_hosted: "Self-Hosted",
  once_off: "Once-Off",
};

const zar = (cents: number) => new Intl.NumberFormat("en-ZA", {
  style: "currency", currency: "ZAR", maximumFractionDigits: 0,
}).format(cents / 100);

function planPrice(option: PriceOption) {
  const cadence = option.billingMode === "managed_monthly" ? "/month" :
    option.billingMode === "managed_annual" ? "/year" : " once-off";
  return `${zar(option.amountCents)}${cadence}`;
}

function primaryAppliesTo(option: PriceOption): PromotionTargetDraft["appliesTo"] {
  return option.billingMode === "managed_monthly" || option.billingMode === "managed_annual"
    ? "recurring" : "project";
}

function DiscountTargetEditor({
  option,
  appliesTo,
  target,
  onToggle,
  onUpdate,
}: Readonly<{
  option: PriceOption;
  appliesTo: PromotionTargetDraft["appliesTo"];
  target?: PromotionTargetDraft;
  onToggle: (enabled: boolean) => void;
  onUpdate: (patch: Partial<PromotionTargetDraft>) => void;
}>) {
  const baseCents = appliesTo === "setup" ? option.setupFeeCents ?? 0 : option.amountCents;
  const title = appliesTo === "setup" ? "Setup fee" :
    appliesTo === "recurring" ? "Plan price" : "Project price";
  return (
    <div className="rounded-lg border border-border bg-background p-4">
      <label className="flex items-start gap-3">
        <input className="mt-1" type="checkbox" checked={Boolean(target)} onChange={event => onToggle(event.target.checked)} />
        <span>
          <span className="block font-semibold">Discount the {title.toLowerCase()}</span>
          <span className="mt-1 block text-sm text-muted-foreground">Current {title.toLowerCase()}: {zar(baseCents)}</span>
        </span>
      </label>
      {target && (
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <div>
            <label className={adminLabelClass} htmlFor={`${option.id}-${appliesTo}-kind`}>Discount type</label>
            <MogenSelect
              id={`${option.id}-${appliesTo}-kind`}
              value={target.discountKind}
              onChange={value => onUpdate({ discountKind: value as PromotionTargetDraft["discountKind"] })}
              tone="admin"
              className="mt-2"
              options={[
                { value: "percent", label: "Percentage" },
                { value: "fixed", label: "Fixed amount (rand)" },
              ]}
            />
          </div>
          <div>
            <label className={adminLabelClass} htmlFor={`${option.id}-${appliesTo}-value`}>
              {target.discountKind === "percent" ? "Percentage (%)" : "Amount (R)"}
            </label>
            <input
              id={`${option.id}-${appliesTo}-value`}
              type="number"
              min="0.01"
              max={target.discountKind === "percent" ? "100" : undefined}
              step="0.01"
              value={target.discountValue}
              onChange={event => onUpdate({ discountValue: event.target.value })}
              className={adminFieldClass}
            />
          </div>
          {appliesTo === "recurring" && (
            <div className="sm:col-span-2">
              <label className={adminLabelClass} htmlFor={`${option.id}-${appliesTo}-months`}>Discounted billing periods (optional)</label>
              <input id={`${option.id}-${appliesTo}-months`} type="number" min="1" value={target.discountedMonths}
                onChange={event => onUpdate({ discountedMonths: event.target.value })} className={adminFieldClass} />
            </div>
          )}
        </div>
      )}
    </div>
  );
}

const stepFields: Record<PromotionWizardStep, Array<keyof PromotionEditorValues>> = {
  details: ["name", "sortOrder", "description", "shortDescription", "ctaLabel", "locationSlug", "maximumCustomers"],
  pricing: ["pricingPackageId", "targets"],
  terms: ["terms", "eligibility", "included"],
  publication: ["startsAt", "endsAt", "isFeatured", "status"],
};

function isStepDirty(step: PromotionWizardStep, values: PromotionEditorValues, clean: PromotionEditorValues) {
  return stepFields[step].some(key => values[key] !== clean[key]);
}

function validationMessage(step: PromotionWizardStep, values: PromotionEditorValues): string | null {
  if (step === "details") {
    if (values.name.trim().length < 3) return "Enter a campaign name of at least three characters.";
    if (!values.description.trim()) return "Add the full promotion description.";
    if (!values.shortDescription.trim()) return "Add the short description used on promotion cards.";
    if (!values.ctaLabel.trim()) return "Add the call-to-action label.";
  }
  if (step === "pricing") {
    if (!values.pricingPackageId) return "Choose the package this promotion belongs to.";
    if (!values.targets.length) return "Add at least one plan or setup-fee discount.";
    if (values.targets.some(target => !target.discountValue || Number(target.discountValue) <= 0))
      return "Every enabled discount needs a value greater than zero.";
    if (values.targets.some(target => target.discountKind === "percent" && Number(target.discountValue) > 100))
      return "Percentage discounts cannot exceed 100%.";
  }
  if (step === "terms" && !values.terms.trim()) return "Add at least one promotion term.";
  if (step === "publication") {
    if (values.status === "scheduled" && !values.startsAt) return "Choose a future start date for a scheduled promotion.";
    if (values.startsAt && values.endsAt && new Date(values.startsAt) >= new Date(values.endsAt))
      return "The end date must be later than the start date.";
  }
  return null;
}

export default function PromotionEditorWizard({
  campaignId,
  mode,
  initialValues,
  priceOptions,
}: Readonly<{
  campaignId: string;
  mode: WizardMode;
  initialValues: PromotionEditorValues;
  priceOptions: PriceOption[];
}>) {
  const router = useRouter();
  const initialState: PromotionWizardState = { status: "idle" };
  const [state, formAction, isPending] = useActionState(savePromotionWizardStepAction, initialState);
  const [values, setValues] = useState(initialValues);
  const [cleanValues, setCleanValues] = useState(initialValues);
  const [activeIndex, setActiveIndex] = useState(0);
  const [furthestIndex, setFurthestIndex] = useState(mode === "edit" ? steps.length - 1 : 0);
  const [navigationMessage, setNavigationMessage] = useState<string | null>(null);
  const nextIndexRef = useRef<number | null>(null);
  const submittedValuesRef = useRef(initialValues);
  const activeStep = steps[activeIndex];
  const dirty = useMemo(
    () => isStepDirty(activeStep.id, values, cleanValues),
    [activeStep.id, cleanValues, values],
  );
  const selectedPackageOptions = useMemo(
    () => priceOptions.filter(option => option.packageId === values.pricingPackageId),
    [priceOptions, values.pricingPackageId],
  );
  const packageOptions = useMemo(() => {
    const packageIds = [...new Set(priceOptions.map(option => option.packageId))];
    return packageIds.map(packageId => {
      const options = priceOptions.filter(option => option.packageId === packageId);
      return {
        value: packageId,
        label: `${options[0]?.packageName ?? packageId} — ${options.map(option => `${paymentLabels[option.billingMode]} ${planPrice(option)}`).join(" · ")}`,
      };
    });
  }, [priceOptions]);

  useEffect(() => {
    if (state.status !== "success" || state.step !== activeStep.id) return;
    const saved = submittedValuesRef.current;
    setValues(saved);
    setCleanValues(saved);
    const nextIndex = nextIndexRef.current;
    nextIndexRef.current = null;
    if (nextIndex !== null) {
      setActiveIndex(nextIndex);
      setFurthestIndex(current => Math.max(current, nextIndex));
    }
    setNavigationMessage(null);
    if (state.step === "publication" && mode === "create") {
      router.replace(`/admin/promotions/${campaignId}`);
    } else {
      router.refresh();
    }
  }, [activeStep.id, campaignId, mode, router, state]);

  useEffect(() => {
    const warn = (event: BeforeUnloadEvent) => {
      if (!dirty) return;
      event.preventDefault();
    };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);

  function update<K extends keyof PromotionEditorValues>(key: K, value: PromotionEditorValues[K]) {
    setValues(current => ({ ...current, [key]: value }));
    setNavigationMessage(null);
  }

  function selectPricingPackage(packageId: string) {
    setValues(current => ({
      ...current,
      pricingPackageId: packageId,
      targets: current.pricingPackageId === packageId ? current.targets : [],
    }));
    setNavigationMessage(null);
  }

  function targetFor(packagePriceId: string, appliesTo: PromotionTargetDraft["appliesTo"]) {
    return values.targets.find(target => target.packagePriceId === packagePriceId && target.appliesTo === appliesTo);
  }

  function toggleTarget(option: PriceOption, appliesTo: PromotionTargetDraft["appliesTo"], enabled: boolean) {
    setValues(current => {
      const remaining = current.targets.filter(target =>
        !(target.packagePriceId === option.id && target.appliesTo === appliesTo));
      return {
        ...current,
        targets: enabled ? [...remaining, {
          packagePriceId: option.id,
          appliesTo,
          discountKind: "percent",
          discountValue: "",
          discountedMonths: "",
        }] : remaining,
      };
    });
    setNavigationMessage(null);
  }

  function updateTarget(
    packagePriceId: string,
    appliesTo: PromotionTargetDraft["appliesTo"],
    patch: Partial<PromotionTargetDraft>,
  ) {
    setValues(current => ({
      ...current,
      targets: current.targets.map(target =>
        target.packagePriceId === packagePriceId && target.appliesTo === appliesTo
          ? { ...target, ...patch } : target),
    }));
    setNavigationMessage(null);
  }

  function validateCurrentStep() {
    const message = validationMessage(activeStep.id, values);
    setNavigationMessage(message);
    return !message;
  }

  function moveTo(index: number) {
    if (index === activeIndex || isPending) return;
    if (dirty) {
      setNavigationMessage("Save or reset your changes before leaving this step.");
      return;
    }
    if (mode === "create" && index > furthestIndex) {
      setNavigationMessage("Complete this step and choose Next before opening a later step.");
      return;
    }
    setNavigationMessage(null);
    setActiveIndex(index);
  }

  function goNext() {
    if (!validateCurrentStep()) return;
    const nextIndex = Math.min(activeIndex + 1, steps.length - 1);
    setActiveIndex(nextIndex);
    setFurthestIndex(current => Math.max(current, nextIndex));
  }

  function prepareSubmit(nextIndex: number | null) {
    if (!validateCurrentStep()) return false;
    submittedValuesRef.current = values;
    nextIndexRef.current = nextIndex;
    return true;
  }

  function cancel() {
    if (dirty && !window.confirm("Discard the unsaved changes on this step?")) return;
    router.push("/admin/promotions");
  }

  const panelClass = `grid gap-5 ${adminCardClass} p-6 sm:grid-cols-2`;
  const error = state.status === "error" && state.step === activeStep.id ? state.message : null;

  return (
    <div className="mt-8">
      <div className={`${adminCardClass} p-2`} role="tablist" aria-label="Promotion setup steps">
        <div className="grid gap-2 sm:grid-cols-4">
          {steps.map((step, index) => {
            const selected = index === activeIndex;
            const locked = mode === "create" && index > furthestIndex;
            return (
              <button
                key={step.id}
                id={`promotion-tab-${step.id}`}
                type="button"
                role="tab"
                aria-selected={selected}
                aria-controls={`promotion-panel-${step.id}`}
                disabled={isPending}
                onClick={() => moveTo(index)}
                className={`rounded-lg px-4 py-3 text-left transition-colors disabled:cursor-wait ${selected ? "bg-catalyst text-white" : "hover:bg-muted"}`}
              >
                <span className="block text-xs font-bold uppercase tracking-wider">{index + 1}. {step.label}{locked ? " · Locked" : ""}</span>
                <span className={`mt-1 block text-xs ${selected ? "text-white/80" : "text-muted-foreground"}`}>{step.description}</span>
              </button>
            );
          })}
        </div>
      </div>

      {(navigationMessage || error || state.status === "success") && (
        <div
          role={error || navigationMessage ? "alert" : "status"}
          className={`mt-4 rounded-md border p-4 text-sm font-semibold ${error || navigationMessage ? "border-red-400 text-red-700 dark:text-red-300" : "border-catalyst text-catalyst"}`}
        >
          {error ?? navigationMessage ?? state.message}
        </div>
      )}

      <form
        action={formAction}
        noValidate
        onSubmit={() => { submittedValuesRef.current = values; }}
        className="mt-5"
      >
        <input type="hidden" name="id" value={campaignId} />
        <input type="hidden" name="step" value={activeStep.id} />

        <section id={`promotion-panel-${activeStep.id}`} role="tabpanel" aria-labelledby={`promotion-tab-${activeStep.id}`}>
          {activeStep.id === "details" && (
            <div className={panelClass}>
              <div className="sm:col-span-2"><h2 className="font-display text-3xl font-black">Campaign details</h2>
                <p className="mt-2 text-muted-foreground">Define what customers see and who the offer is for.</p></div>
              <div><label htmlFor="promotion-name" className={adminLabelClass}>Name</label>
                <input id="promotion-name" name="name" value={values.name} onChange={event => update("name", event.target.value)} className={adminFieldClass} /></div>
              <div><label htmlFor="promotion-order" className={adminLabelClass}>Display order</label>
                <input id="promotion-order" name="sortOrder" type="number" min="0" value={values.sortOrder} onChange={event => update("sortOrder", event.target.value)} className={adminFieldClass} /></div>
              <div className="sm:col-span-2"><label htmlFor="promotion-description" className={adminLabelClass}>Description</label>
                <textarea id="promotion-description" name="description" rows={4} value={values.description} onChange={event => update("description", event.target.value)} className={adminFieldClass} /></div>
              <div className="sm:col-span-2"><label htmlFor="promotion-short" className={adminLabelClass}>Short description</label>
                <input id="promotion-short" name="shortDescription" maxLength={300} value={values.shortDescription} onChange={event => update("shortDescription", event.target.value)} className={adminFieldClass} /></div>
              <div><label htmlFor="promotion-cta" className={adminLabelClass}>CTA label</label>
                <input id="promotion-cta" name="ctaLabel" value={values.ctaLabel} onChange={event => update("ctaLabel", event.target.value)} className={adminFieldClass} /></div>
              <div><label htmlFor="promotion-location" className={adminLabelClass}>Location eligibility</label>
                <select id="promotion-location" name="locationSlug" value={values.locationSlug} onChange={event => update("locationSlug", event.target.value)} className={adminFieldClass}>
                  <option value="">All locations</option><option value="maboloka">Maboloka</option>
                  <option value="soshanguve">Soshanguve</option><option value="centurion">Centurion</option>
                </select></div>
              <div><label htmlFor="promotion-cap" className={adminLabelClass}>Maximum customers (empty = no cap)</label>
                <input id="promotion-cap" name="maximumCustomers" type="number" min="1" value={values.maximumCustomers} onChange={event => update("maximumCustomers", event.target.value)} className={adminFieldClass} /></div>
            </div>
          )}

          {activeStep.id === "pricing" && (
            <div className={panelClass}>
              <div className="sm:col-span-2"><h2 className="font-display text-3xl font-black">Offer and pricing</h2>
                <p className="mt-2 text-muted-foreground">Choose one package, then add discounts to any of its payment plans and setup fees.</p></div>
              <input type="hidden" name="targets" value={JSON.stringify(values.targets)} />
              <div className="sm:col-span-2">
                <label htmlFor="promotion-package" className={adminLabelClass}>Published package</label>
                <MogenSelect id="promotion-package" name="pricingPackageId" value={values.pricingPackageId}
                  onChange={selectPricingPackage} placeholder="Select a package and view its prices" tone="admin"
                  className="mt-2" options={packageOptions} />
              </div>
              {selectedPackageOptions.map(option => {
                const mainAppliesTo = primaryAppliesTo(option);
                return (
                  <article key={option.id} className="sm:col-span-2 rounded-xl border border-border bg-muted/30 p-5">
                    <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <h3 className="text-lg font-black">{paymentLabels[option.billingMode]}</h3>
                        <p className="mt-1 text-sm text-muted-foreground">
                          {planPrice(option)}{option.setupFeeCents !== null ? ` · Setup ${zar(option.setupFeeCents)}` : ""}
                        </p>
                      </div>
                      <span className="rounded-full bg-catalyst/10 px-3 py-1 text-xs font-bold text-catalyst">{option.id}</span>
                    </div>
                    <div className="grid gap-3 lg:grid-cols-2">
                      <DiscountTargetEditor option={option} appliesTo={mainAppliesTo}
                        target={targetFor(option.id, mainAppliesTo)}
                        onToggle={enabled => toggleTarget(option, mainAppliesTo, enabled)}
                        onUpdate={patch => updateTarget(option.id, mainAppliesTo, patch)} />
                      {option.setupFeeCents && option.setupFeeCents > 0 ? (
                        <DiscountTargetEditor option={option} appliesTo="setup"
                          target={targetFor(option.id, "setup")}
                          onToggle={enabled => toggleTarget(option, "setup", enabled)}
                          onUpdate={patch => updateTarget(option.id, "setup", patch)} />
                      ) : (
                        <div className="rounded-lg border border-dashed border-border p-4 text-sm text-muted-foreground">
                          <strong className="block text-foreground">No setup fee to discount</strong>
                          This plan has a {zar(0)} setup fee. Apply the promotion to its {mainAppliesTo === "project" ? "project" : "plan"} price instead.
                        </div>
                      )}
                    </div>
                  </article>
                );
              })}
            </div>
          )}

          {activeStep.id === "terms" && (
            <div className={panelClass}>
              <div className="sm:col-span-2"><h2 className="font-display text-3xl font-black">Terms and inclusions</h2>
                <p className="mt-2 text-muted-foreground">Enter one clear item per line. At least one term is required.</p></div>
              {(["terms", "eligibility", "included"] as const).map(key => (
                <div key={key} className="sm:col-span-2">
                  <label htmlFor={`promotion-${key}`} className={adminLabelClass}>{key[0].toUpperCase() + key.slice(1)} — one per line</label>
                  <textarea id={`promotion-${key}`} name={key} rows={6} value={values[key]} onChange={event => update(key, event.target.value)} className={adminFieldClass} />
                </div>
              ))}
            </div>
          )}

          {activeStep.id === "publication" && (
            <div className={panelClass}>
              <div className="sm:col-span-2"><h2 className="font-display text-3xl font-black">Schedule and publish</h2>
                <p className="mt-2 text-muted-foreground">Review the timing and choose the status to save.</p></div>
              <div><label htmlFor="promotion-start" className={adminLabelClass}>Starts (South African time, SAST)</label>
                <input id="promotion-start" name="startsAt" type="datetime-local" value={values.startsAt} onChange={event => update("startsAt", event.target.value)} className={adminFieldClass} /></div>
              <div><label htmlFor="promotion-end" className={adminLabelClass}>Ends (South African time, SAST)</label>
                <input id="promotion-end" name="endsAt" type="datetime-local" value={values.endsAt} onChange={event => update("endsAt", event.target.value)} className={adminFieldClass} /></div>
              <div><label htmlFor="promotion-status" className={adminLabelClass}>Status</label>
                <select id="promotion-status" name="status" value={values.status} onChange={event => update("status", event.target.value as PromotionEditorValues["status"])} className={adminFieldClass}>
                  <option value="draft">Draft</option><option value="scheduled">Scheduled</option>
                  <option value="active">Active (published)</option><option value="expired">Expired</option><option value="archived">Archived</option>
                </select></div>
              <label className="flex items-center gap-3 self-end pb-3 text-sm font-semibold">
                <input type="checkbox" name="isFeatured" checked={values.isFeatured} onChange={event => update("isFeatured", event.target.checked)} /> Featured on homepage
              </label>
            </div>
          )}
        </section>

        <div className="mt-5 flex flex-wrap items-center gap-3">
          <button type="button" onClick={cancel} disabled={isPending} className="rounded-md border border-border px-5 py-3 font-semibold hover:bg-muted disabled:opacity-50">Cancel</button>
          <button type="button" onClick={() => { setValues(cleanValues); setNavigationMessage(null); }} disabled={!dirty || isPending} className="rounded-md border border-border px-5 py-3 font-semibold hover:bg-muted disabled:cursor-not-allowed disabled:opacity-40">Reset changes</button>
          <span className="ml-auto text-sm font-semibold text-muted-foreground">{dirty ? "Unsaved changes" : "All changes saved"}</span>
          {activeIndex < steps.length - 1 ? (
            dirty ? (
              <button
                type="submit"
                onClick={event => {
                  if (!prepareSubmit(activeIndex + 1)) event.preventDefault();
                }}
                disabled={isPending}
                className={adminPrimaryClass}
              >{isPending ? "Saving…" : "Save & next"}</button>
            ) : (
              <button type="button" onClick={goNext} disabled={isPending} className={adminPrimaryClass}>Next</button>
            )
          ) : dirty ? (
            <button
              type="submit"
              onClick={event => {
                if (!prepareSubmit(null)) event.preventDefault();
              }}
              disabled={isPending}
              className={adminPrimaryClass}
            >{isPending ? "Saving…" : "Save promotion"}</button>
          ) : (
            <button type="button" onClick={() => router.push("/admin/promotions")} className={adminPrimaryClass}>Done</button>
          )}
        </div>
      </form>
    </div>
  );
}
