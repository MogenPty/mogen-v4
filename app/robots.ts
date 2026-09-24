import type { MetadataRoute } from "next";
import { siteConfig } from "@/data/site";

export default function robots(): MetadataRoute.Robots {
  return {
    // Canonical host is always production; Vercel is never canonical (see layout canonical)
    // We intentionally keep index:true for now to allow testing search metadata on Vercel.
    // The canonical signal prevents Vercel from competing with www.mogen.co.za as a duplicate.
    // If staging isolation becomes stricter, consider environment-aware noindex:
    //   index: process.env.VERCEL_ENV === "production" && !process.env.VERCEL_URL?.includes("vercel.app")
    rules: {
      userAgent: "*",
      allow: "/",
    },
    sitemap: `${siteConfig.url}/sitemap.xml`,
    host: siteConfig.url,
  };
}
