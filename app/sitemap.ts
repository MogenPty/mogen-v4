import type { MetadataRoute } from "next";
import { getPublicPromotions } from "@/data/promotions";
import { siteConfig } from "@/data/site";
import { getAllArticles } from "@/lib/articles/loader";

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
    "/articles",
    "/promotions",
    "/contact",
    "/locations/maboloka",
    "/locations/soshanguve",
    "/privacy-policy",
    "/terms-of-service",
  ];

  const staticEntries: MetadataRoute.Sitemap = staticRoutes.map((route) => ({
    url: `${base}${route || "/"}`,
    lastModified: now,
    changeFrequency: route === "" ? "weekly" : "monthly",
    priority: getRoutePriority(route),
  }));

  // Article URLs derive from MDX frontmatter (drafts excluded by the loader).
  const articleEntries: MetadataRoute.Sitemap = getAllArticles().map(
    (article) => ({
      url: `${base}/articles/${article.slug}`,
      lastModified: new Date(article.updatedAt ?? article.publishedAt),
      changeFrequency: "monthly" as const,
      priority: 0.6,
    }),
  );

  const promotionEntries: MetadataRoute.Sitemap = getPublicPromotions().map((p) => ({
    url: `${base}/promotions/${p.slug}`,
    lastModified: now,
    changeFrequency: "weekly" as const,
    priority: 0.7,
  }));

  return [...staticEntries, ...articleEntries, ...promotionEntries];
}

function getRoutePriority(route: string) {
  if (route === "") return 1;
  if (route.startsWith("/services")) return 0.8;
  return 0.5;
}
