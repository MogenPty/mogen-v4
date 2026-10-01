import type { MetadataRoute } from "next";
import { siteConfig } from "@/data/site";

export default function robots(): MetadataRoute.Robots {
  return {
    // Canonical host comes from configuration (siteConfig.url), so the same
    // build can deploy to another domain without source changes.
    // We intentionally keep index:true for now to allow testing search metadata on Vercel.
    // The canonical signal prevents non-production hosts competing as duplicates.
    // If staging isolation becomes stricter, consider environment-aware noindex:
    //   index: process.env.VERCEL_ENV === "production" && !process.env.VERCEL_URL?.includes("vercel.app")
    rules: {
      userAgent: "*",
      allow: "/",
    },
    sitemap: `${siteConfig.url}/sitemap.xml`,
  };
}
