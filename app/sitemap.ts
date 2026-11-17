import type { MetadataRoute } from "next";
import { getPublicPromotions } from "@/data/promotions";
import { siteConfig } from "@/data/site";
import { getAllArticles } from "@/lib/articles/loader";

// Hourly regeneration so scheduled articles enter the sitemap when they
// become eligible, without a manual redeploy (max delay ~1h; the generated
// article bundle itself refreshes at build time — see docs/articles.md).
export const revalidate = 3600;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
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
    "/locations",
    "/locations/maboloka",
    "/locations/soshanguve",
    "/locations/centurion",
    "/faq",
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

  // Keep the fallback import test/build-safe; the server-only database module is
  // loaded only when the production catalogue is explicitly enabled.
  const promotions = process.env.MOGEN_WEB_CATALOGUE_SOURCE === "database"
    ? await import("@/lib/catalogue/promotions-server").then(module => module.loadPublicPromotions())
    : getPublicPromotions();
  const promotionEntries: MetadataRoute.Sitemap = promotions.map((p) => ({
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
