"use client";

import { GoogleAnalytics } from "@next/third-parties/google";

export default function JSAnalytics() {
  return (
    <>
      {process.env.NEXT_PUBLIC_AHREFS_ANALYTICS_ID && (
        <script
          src="https://analytics.ahrefs.com/analytics.js"
          data-key={process.env.NEXT_PUBLIC_AHREFS_ANALYTICS_ID}
          async
        ></script>
      )}
      {process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID && (
        <GoogleAnalytics gaId={process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID} />
      )}
    </>
  );
}
