// Thin wrapper around the Rampify tracker so form success callbacks can
// record conversions without worrying about script load timing.
// The early-call queue (see components/mogen/js-analytics.tsx) makes
// window.rampify available before the tracker script has loaded.

declare global {
  interface Window {
    rampify?: {
      trackConversion: (opts: { label: string }) => void;
      getConversionId: () => string;
      getSessionId: () => string;
      ready: (cb: (r: Window["rampify"]) => void) => void;
      decorateUrl: (u: string) => string;
      q?: unknown[];
    };
  }
}

export function trackConversion(label: string): void {
  if (typeof window === "undefined") return;
  window.rampify?.trackConversion?.({ label });
}
