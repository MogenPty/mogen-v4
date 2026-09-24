import type { MetadataRoute } from "next";
import { siteConfig } from "@/lib/site";

export default function sitemap(): MetadataRoute.Sitemap {
  const base = siteConfig.url;
  const now = new Date();

  const routes = [
    "",
    "/services",
    "/services/web-development",
    "/services/seo",
    "/services/digital-marketing",
    "/services/business-documentation",
    "/about",
    "/contact",
    "/blog",
    "/privacy-policy",
    "/terms-of-service",
  ];

  return routes.map((route) => ({
    url: `${base}${route || "/"}`,
    lastModified: now,
    changeFrequency: route === "" ? "weekly" : "monthly",
    priority: getRoutePriority(route),
  }));
}

function getRoutePriority(route: string) {
  if (route === "") return 1;
  if (route.startsWith("/services")) return 0.8;
  return 0.5;
}
