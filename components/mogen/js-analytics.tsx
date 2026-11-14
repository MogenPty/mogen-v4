"use client";

import Script from "next/script";

export default function JSAnalytics() {
  return (
    <>
      {process.env.NEXT_PUBLIC_AHREFS_ANALYTICS_ID && (
        <Script
          strategy="afterInteractive"
          src="https://analytics.ahrefs.com/analytics.js"
          data-key={process.env.NEXT_PUBLIC_AHREFS_ANALYTICS_ID}
          async
        />
      )}
    </>
  );
}
