"use client";

export default function RampifyAnalytics() {
  return (
    <>
      {/* Rampify early-call queue: makes window.rampify usable before the
            deferred tracker script has loaded (see conversion tracking docs). */}
      <script
        // biome-ignore lint/security/noDangerouslySetInnerHtml: Until we get a solution for this
        dangerouslySetInnerHTML={{
          __html:
            "window.rampify=window.rampify||{q:[]};['trackConversion','ready'].forEach(function(m){window.rampify[m]=window.rampify[m]||function(){(window.rampify.q=window.rampify.q||[]).push([m,arguments]);};});window.rampify.decorateUrl=window.rampify.decorateUrl||function(u){return u;};",
        }}
      />
      {/* Rampify site tracker (all pages): deferred, loads after parsing. */}
      <script
        defer
        src="https://www.rampify.dev/tracker.js"
        data-site-id={process.env.NEXT_PUBLIC_RAMPIFY_TRACKER_ID}
      />
    </>
  );
}
