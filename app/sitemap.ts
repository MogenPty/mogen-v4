import type { MetadataRoute } from "next";
import { POSTS } from "@/data/blog";
import { siteConfig } from "@/data/site";

export default function sitemap(): MetadataRoute.Sitemap {
  const base = siteConfig.url;
  const now = new Date();

  const staticRoutes = [
    "",
    "/about",
    "/services",
    "/services/web-development",
    "/services/seo",
    "/services/digital-marketing",
    "/services/business-documentation",
    "/pricing",
    "/process",
    "/resources",
    "/partners",
    "/success-stories",
    "/blog",
    "/contact",
    "/privacy-policy",
    "/terms-of-service",
  ];

  const staticEntries: MetadataRoute.Sitemap = staticRoutes.map((route) => ({
    url: `${base}${route || "/"}`,
    lastModified: now,
    changeFrequency: route === "" ? "weekly" : "monthly",
    priority: getRoutePriority(route),
  }));

  const blogEntries: MetadataRoute.Sitemap = POSTS.map((post) => ({
    url: `${base}/blog/${post.slug}`,
    lastModified: new Date(post.date),
    changeFrequency: "monthly" as const,
    priority: 0.6,
  }));

  return [...staticEntries, ...blogEntries];
}

function getRoutePriority(route: string) {
  if (route === "") return 1;
  if (route.startsWith("/services")) return 0.8;
  return 0.5;
}
