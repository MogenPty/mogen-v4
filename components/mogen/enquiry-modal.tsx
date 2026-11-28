"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Script from "next/script";
import { formatPromotionPrice } from "@/data/promotions";
import { SERVICES } from "@/data/services";
import { getPackage } from "@/data/packages";
import type { BillingMode } from "@/lib/catalogue/commercial";
import { trackConversion } from "@/lib/rampify-tracker";
import { resolveEnquiryService } from "@/lib/enquiry/enquiry";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue } from "@/components/ui/select";
import MagneticButton from "./magnet-button";

const TURNSTILE_SITE_KEY = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY ?? "";

export type EnquiryContext =
  | { type: "general" }
  | { type: "service"; serviceSlug: string }
  | { type: "promotion"; promotion: import("@/data/promotions").Promotion }
  | { type: "package"; packageId: string };

export interface EnquiryPaymentOption {
  id: string;
  packageId: string;
  billingMode: BillingMode;
  amountCents: number;
  setupFeeCents: number | null;
}

interface EnquiryModalProps {
  /** Whether the modal is open. */
  open: boolean;
  /** Called when modal should close. */
  onClose: () => void;
  /** Context for the enquiry (pre-fills form). */
  context: EnquiryContext;
  packageName?: string;
  initialPriceOptionId?: string;
  initialMessage?: string;
  prices: EnquiryPaymentOption[];
  /** UTM attribution. */
  attribution?: import("@/lib/enquiry/enquiry").EnquiryAttribution;
  /** Called on successful submit. */
  onSubmit?: () => void;
}

const PAYMENT_LABELS: Record<BillingMode, string> = {
  managed_monthly: "Mogen managed, billed monthly",
  managed_annual: "Mogen managed, billed annually",
  once_off: "Once-off project payment",
  self_hosted: "Self-hosted, once-off payment",
};

const PAYMENT_GROUPS = [
  { label: "Mogen managed", modes: ["managed_monthly", "managed_annual"] },
  { label: "Project payments", modes: ["once_off", "self_hosted"] },
];
const zar = new Intl.NumberFormat("en-ZA", { style: "currency", currency: "ZAR" });

export default function EnquiryModal({
  open,
  onClose,
  context,
  packageName,
  initialPriceOptionId,
  initialMessage,
  prices,
  attribution,
  onSubmit,
}: Readonly<EnquiryModalProps>) {
  const widgetNode = useRef<HTMLDivElement>(null);
  const widgetId = useRef<string | null>(null);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const promotion = context.type === "promotion" ? context.promotion : undefined;
  const packageId = context.type === "package" ? context.packageId : (promotion?.relatedPackage ?? "");
  const serviceSlug = context.type === "service" ? context.serviceSlug
    : promotion?.relatedService ?? getPackage(packageId)?.serviceSlug;
  const [chosenService, setChosenService] = useState("");
  const service = context.type === "general" ? chosenService
    : resolveEnquiryService(serviceSlug)?.name ?? "Web Development";
  const targetIds = promotion?.targetPriceOptionIds ?? (promotion?.targetPriceOptionId ? [promotion.targetPriceOptionId] : []);
  const options = prices.filter((price) => price.packageId === packageId &&
    (promotion?.source !== "database" || targetIds.includes(price.id)));
  const offerUnavailable = promotion?.source === "database" && options.length === 0;
  const [priceOption, setPriceOption] = useState(() =>
    options.find(({ id }) => id === initialPriceOptionId)?.id ?? (options.length === 1 ? options[0].id : ""),
  );
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    businessName: "",
    otherServiceDetail: "",
    message: initialMessage ?? "",
  });
  const [token, setToken] = useState("");

  const renderWidget = useCallback(() => {
    if (!TURNSTILE_SITE_KEY || !open || !widgetNode.current || !window.turnstile || widgetId.current) return;
    widgetId.current = window.turnstile.render(widgetNode.current, {
      sitekey: TURNSTILE_SITE_KEY,
      action: "contact",
      theme: "auto",
      callback: setToken,
      "expired-callback": () => setToken(""),
      "error-callback": () => setToken(""),
    });
  }, [open]);

  useEffect(() => {
    renderWidget();
    return () => {
      if (widgetId.current) {
        window.turnstile?.remove(widgetId.current);
        widgetId.current = null;
      }
    };
  }, [renderWidget]);

  function handleChange(field: keyof typeof formData, value: string) {
    setFormData((prev) => ({ ...prev, [field]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (sending || offerUnavailable) return;
    if (!service) {
      setError("Choose a service to continue.");
      return;
    }
    if (service === "Other" && !formData.otherServiceDetail.trim()) {
      setError("Please specify your service.");
      return;
    }
    if (options.length > 0 && !priceOption) {
      setError("Choose a payment option to continue.");
      return;
    }

    if (!formData.name.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email.trim())) {
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
          ...formData,
          service,
          package: packageId,
          priceOption,
          promotion: promotion?.source === "database" ? promotion.slug : undefined,
          message: promotion && promotion.source !== "database"
            ? `Enquiring about "${promotion.name}".\n\n${formData.message}`
            : formData.message,
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
      onSubmit?.();
      onClose();
    } catch {
      setError("Unable to send your enquiry. Please try again or email info@mogen.co.za.");
      setToken("");
      if (widgetId.current) window.turnstile?.reset(widgetId.current);
    } finally {
      setSending(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-h-[calc(100dvh-2rem)] max-w-lg overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Start Your Enquiry</DialogTitle>
          <DialogDescription>
            {context.type === "general" && "Tell us what you need and we’ll help you with the next step."}
            {context.type === "service" && <>Tell us what you need from <strong>{service}</strong>.</>}
            {context.type === "promotion" && (
              <>Enquiring about <strong>{context.promotion.name}</strong> promotion.</>
            )}
            {context.type === "package" && (
              <>Enquiring about the <strong>{packageName ?? packageId}</strong> package.</>
            )}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <Label htmlFor="enquiry-name">Your name *</Label>
              <Input
                id="enquiry-name"
                value={formData.name}
                onChange={(e) => handleChange("name", e.target.value)}
                placeholder="Jane Doe"
                required
              />
            </div>
            <div>
              <Label htmlFor="enquiry-email">Email address *</Label>
              <Input
                id="enquiry-email"
                type="email"
                value={formData.email}
                onChange={(e) => handleChange("email", e.target.value)}
                placeholder="jane@example.co.za"
                required
              />
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <Label htmlFor="enquiry-phone">Phone / WhatsApp</Label>
              <Input
                id="enquiry-phone"
                type="tel"
                value={formData.phone}
                onChange={(e) => handleChange("phone", e.target.value)}
                placeholder="+27 71 863 1884"
              />
            </div>
            <div>
              <Label htmlFor="enquiry-business">Business name</Label>
              <Input
                id="enquiry-business"
                value={formData.businessName}
                onChange={(e) => handleChange("businessName", e.target.value)}
                placeholder="Acme Trading (Pty) Ltd"
              />
            </div>
          </div>

          {context.type === "general" ? (
            <div>
              <Label htmlFor="enquiry-service">Service of interest</Label>
              <Select value={chosenService} onValueChange={setChosenService} required>
                <SelectTrigger id="enquiry-service" className="mt-2 min-h-11 w-full">
                  <SelectValue placeholder="Choose a service" />
                </SelectTrigger>
                <SelectContent>
                  {SERVICES.map(({ slug, name }) => <SelectItem key={slug} value={name}>{name}</SelectItem>)}
                  <SelectItem value="Other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
          ) : (
            <dl className="grid gap-3 border-y border-border py-3 sm:grid-cols-2">
              <div><dt className="text-muted-foreground">Service</dt><dd className="font-semibold">{service}</dd></div>
              {packageId && <div><dt className="text-muted-foreground">Package</dt><dd className="font-semibold">{packageName ?? packageId}</dd></div>}
            </dl>
          )}

          {service === "Other" && (
            <div>
              <Label htmlFor="enquiry-other-service">Specify your service *</Label>
              <Input
                id="enquiry-other-service"
                value={formData.otherServiceDetail}
                onChange={(e) => handleChange("otherServiceDetail", e.target.value)}
                maxLength={200}
                required
              />
            </div>
          )}

          {options.length > 0 ? (
            <div>
              <Label htmlFor="enquiry-payment">Payment option</Label>
              <Select value={priceOption} onValueChange={setPriceOption} required>
                <SelectTrigger id="enquiry-payment" className="mt-2 min-h-11 w-full">
                  <SelectValue placeholder="Choose a payment option" />
                </SelectTrigger>
                <SelectContent position="popper" align="start" className="w-(--radix-select-trigger-width)">
                  {PAYMENT_GROUPS.map(({ label, modes }) => {
                    const group = options.filter((option) => modes.includes(option.billingMode));
                    return group.length > 0 && (
                      <SelectGroup key={label}>
                        <SelectLabel>{label}</SelectLabel>
                        {group.map((option) => {
                          const lines = promotion?.pricing.filter((line) => line.priceOptionId === option.id) ?? [];
                          const main = lines.find((line) => line.appliesTo !== "setup");
                          const setup = lines.find((line) => line.appliesTo === "setup");
                          const amount = main?.promotional
                            ? formatPromotionPrice(main.promotional, main.cadence)
                            : zar.format(option.amountCents / 100);
                          const fee = setup?.promotional ?? (option.setupFeeCents ? zar.format(option.setupFeeCents / 100) : undefined);
                          return (
                            <SelectItem key={option.id} value={option.id} textValue={`${PAYMENT_LABELS[option.billingMode]} ${amount}`} className="min-h-12 py-2">
                              <span className="grid whitespace-normal">
                                <span className="font-semibold">{PAYMENT_LABELS[option.billingMode]}</span>
                                <span>{amount}{fee ? ` + ${fee} setup` : ""}</span>
                              </span>
                            </SelectItem>
                          );
                        })}
                      </SelectGroup>
                    );
                  })}
                </SelectContent>
              </Select>
            </div>
          ) : offerUnavailable ? (
            <p role="alert">This offer has no published payment option available.</p>
          ) : packageId && service === "Web Development" ? (
            <p>Pricing is confirmed by quotation.</p>
          ) : null}

          <div>
            <Label htmlFor="enquiry-message">Your requirements *</Label>
            <Textarea
              id="enquiry-message"
              value={formData.message}
              onChange={(e) => handleChange("message", e.target.value)}
              placeholder="Describe your project, goals, timeline, or any specific needs…"
              className="min-h-[120px]"
              required
            />
          </div>

          {TURNSTILE_SITE_KEY ? (
            <>
              <Script
                src="https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit"
                strategy="afterInteractive"
                onReady={renderWidget}
              />
              <div ref={widgetNode} className="mt-2" />
            </>
          ) : (
            <p className="text-sm text-amber-500" role="alert">
              Verification is unavailable. Please contact info@mogen.co.za directly.
            </p>
          )}

          {error && <p className="text-sm text-red-500" role="alert">{error}</p>}

          <DialogFooter className="flex-col sm:flex-row">
            <MagneticButton type="button" variant="outline" onClick={onClose} disabled={sending}>
              Cancel
            </MagneticButton>
            <MagneticButton type="submit" variant="catalyst" disabled={sending || offerUnavailable}>
              {sending ? "Sending…" : "Send Enquiry"}
            </MagneticButton>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
