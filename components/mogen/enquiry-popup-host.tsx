"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import EnquiryModal, { type EnquiryContext, type EnquiryPaymentOption } from "./enquiry-modal";
import { ATTRIBUTION_KEYS, type EnquiryAttribution } from "@/lib/enquiry/enquiry";

export interface PopupEnquiry {
  context: EnquiryContext;
  packageName?: string;
  prices: EnquiryPaymentOption[];
  attribution?: EnquiryAttribution;
  initialPriceOptionId?: string;
  initialMessage?: string;
}

const contextKeys = ["service", "package", "promotion", "priceOption", "website"];

export default function EnquiryPopupHost() {
  const pathname = usePathname();
  const request = useRef<AbortController | null>(null);
  const [selection, setSelection] = useState<{ path: string; payload: PopupEnquiry | null } | null>(null);
  const current = selection?.path === pathname ? selection : null;

  function close() {
    request.current?.abort();
    setSelection(null);
  }

  useEffect(() => {
    async function openEnquiry(event: MouseEvent) {
      if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey ||
          event.shiftKey || event.altKey || !(event.target instanceof Element)) return;

      const anchor = event.target.closest<HTMLAnchorElement>("a[href]");
      if (!anchor || anchor.hasAttribute("download") || (anchor.target && anchor.target !== "_self")) return;
      const url = new URL(anchor.href);
      if (url.origin !== window.location.origin) return;
      const contactLink = url.pathname.replace(/\/$/, "") === "/contact";
      const service = anchor.dataset.enquiryService;
      const quoteAction = service && (url.hash === "#quote" || (pathname === "/" && url.hash === "#assessment" && url.pathname === "/"));
      if (!quoteAction && (!contactLink ||
          (!service && !anchor.hasAttribute("data-enquiry") && !contextKeys.some((key) => url.searchParams.has(key))))) return;

      const params = new URLSearchParams(url.search);
      const pageParams = new URLSearchParams(window.location.search);
      if (service && !params.has("service")) params.set("service", service);
      for (const key of ATTRIBUTION_KEYS) {
        const value = pageParams.get(key);
        if (value && !params.has(key)) params.set(key, value);
      }

      event.preventDefault();
      request.current?.abort();
      const controller = new AbortController();
      request.current = controller;
      setSelection({ path: pathname, payload: null });

      try {
        const response = await fetch(`/api/enquiry-context?${params}`, { signal: controller.signal });
        if (!response.ok) throw new Error("Unable to load enquiry context");
        const payload: PopupEnquiry = await response.json();
        if (!controller.signal.aborted) setSelection({ path: pathname, payload });
      } catch {
        if (!controller.signal.aborted) window.location.assign(`/contact?${params}`);
      }
    }

    document.addEventListener("click", openEnquiry, true);
    return () => {
      request.current?.abort();
      document.removeEventListener("click", openEnquiry, true);
    };
  }, [pathname]);

  if (!current) return null;
  if (current.payload) return <EnquiryModal open onClose={close} {...current.payload} />;
  return (
    <Dialog open onOpenChange={close}>
      <DialogContent>
        <DialogTitle>Start Your Enquiry</DialogTitle>
        <DialogDescription>Loading enquiry details…</DialogDescription>
      </DialogContent>
    </Dialog>
  );
}
