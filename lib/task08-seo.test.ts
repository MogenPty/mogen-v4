import { readFileSync } from "node:fs";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { getPromotionBySlug, getPublicPromotions } from "@/data/promotions";
import { getPost, POSTS } from "@/data/blog";
import { getService, SERVICES } from "@/data/services";
import { getSiteUrl } from "@/data/site";
import { canonicalUrl, normalizePath, pageMetadata } from "@/lib/seo";

function readSource(relativePath: string): string {
  return readFileSync(join(process.cwd(), relativePath), "utf8");
}

describe("task 8 — environment-driven site URL", () => {
  const KEY = "NEXT_PUBLIC_SITE_URL";

  afterEach(() => {
    delete process.env[KEY];
  });

  it("derives canonical URLs from configuration, never hardcoded", () => {
    process.env[KEY] = "https://mogen-v4.vercel.app";
    expect(canonicalUrl("/services/seo")).toBe(
      "https://mogen-v4.vercel.app/services/seo",
    );
    delete process.env[KEY];
    expect(canonicalUrl("/services/seo")).toBe(
      "https://www.mogen.co.za/services/seo",
    );
    expect(getSiteUrl()).toBe("https://www.mogen.co.za");
  });

  it("strips query strings, hashes and trailing slashes from canonicals", () => {
    expect(normalizePath("/contact?service=seo&utm_source=x")).toBe(
      "/contact",
    );
    expect(normalizePath("/services/seo/")).toBe("/services/seo");
    expect(normalizePath("/")).toBe("/");
    expect(canonicalUrl("/contact?promotion=mogen-sprout-first-100")).toBe(
      `${getSiteUrl()}/contact`,
    );
    expect(canonicalUrl("/")).toBe(`${getSiteUrl()}/`);
  });

  it("keeps technical URL generation free of hardcoded hosts", () => {
    for (const file of [
      "lib/seo.ts",
      "app/robots.ts",
      "app/sitemap.ts",
      "app/services/[slug]/page.tsx",
      "app/articles/[slug]/page.tsx",
      "app/promotions/[slug]/page.tsx",
    ]) {
      const source = readSource(file);
      expect(source).not.toContain("https://www.mogen.co.za");
      expect(source).not.toContain("mogen-v4.vercel.app");
    }
  });
});

describe("task 8 — robots generation", () => {
  it("emits an environment-driven sitemap without a Host directive", () => {
    const source = readSource("app/robots.ts");
    expect(source).toContain("siteConfig.url");
    expect(source).toContain("/sitemap.xml");
    expect(source).not.toContain("host:");
    expect(source).not.toContain("Host:");
    expect(source).not.toContain("https://www.mogen.co.za");
  });
});

describe("task 8 — sitemap generation", () => {
  it("covers the core public routes without query variants or API routes", () => {
    const source = readSource("app/sitemap.ts");
    for (const route of [
      "/about",
      "/services",
      "/services/web-development",
      "/services/seo",
      "/services/digital-marketing",
      "/services/business-documentation",
      "/promotions",
      "/articles",
      "/contact",
    ]) {
      expect(source).toContain(route);
    }
    expect(source).not.toContain("utm_");
    // No enquiry/query-string URL variants in sitemap entries.
    expect(source).not.toContain("?service=");
    expect(source).not.toContain("?promotion=");
    expect(source).not.toContain("?package=");
    expect(source).not.toContain("/api/");
    expect(source).not.toContain("growth-audit-results");
  });

  it("includes only public promotions (draft/archived excluded)", () => {
    const publicSlugs = getPublicPromotions().map((p) => p.slug);
    // Expired promotions stay public as historical pages.
    expect(publicSlugs).toContain("mogen-sprout-first-100");
    expect(publicSlugs).toContain("mogen-seed-r99");
    const source = readSource("app/sitemap.ts");
    expect(source).toContain("getPublicPromotions");
  });

  it("includes every blog article route", () => {
    expect(POSTS.length).toBeGreaterThan(0);
    for (const post of POSTS) {
      expect(post.slug).toBeTruthy();
      expect(getPost(post.slug)).toBeDefined();
    }
    // Article sitemap entries derive from MDX frontmatter via the loader
    // (POSTS itself is derived from the same frontmatter — see data/blog.ts).
    expect(readSource("app/sitemap.ts")).toContain("getAllArticles");
  });
});

describe("task 8 — title generation (no Mogen | Mogen)", () => {
  it("uses short titles so the layout template cannot duplicate the brand", () => {
    for (const [file, title] of [
      ["app/services/page.tsx", '"Services"'],
      ["app/promotions/page.tsx", '"Promotions"'],
      ["app/pricing/page.tsx", '"Pricing"'],
      ["app/articles/page.tsx", '"Articles"'],
    ] as const) {
      const source = readSource(file);
      expect(source).toContain(`title: ${title}`);
      expect(source).not.toContain("— Mogen");
      expect(source).not.toContain("| Mogen");
    }
    const promoMeta = readSource("app/promotions/[slug]/page.tsx");
    expect(promoMeta).not.toContain("— Mogen");
    expect(promoMeta).not.toContain("| Mogen");
    // Layout template appends exactly one brand suffix.
    expect(readSource("app/layout.tsx")).toContain("template:");
  });

  it("gives service and article pages server-side titles", () => {
    expect(readSource("app/services/[slug]/page.tsx")).toContain(
      "generateMetadata",
    );
    expect(readSource("app/articles/[slug]/page.tsx")).toContain(
      "generateMetadata",
    );
    // No client-side document.title overrides remain.
    expect(readSource("components/mogen/service-detail.tsx")).not.toContain(
      "document.title",
    );
  });
});

describe("task 8 — promotion metadata", () => {
  it("keeps Sprout pricing intact (R900 / R299 / R399 / 100 / R150)", () => {
    const sprout = getPromotionBySlug("mogen-sprout-first-100")!;
    expect(
      sprout.pricing.find((p) => p.label === "Setup fee")?.promotional,
    ).toBe("R900");
    expect(
      sprout.pricing.find((p) => p.label === "Monthly subscription")
        ?.promotional,
    ).toBe("R299/month");
    expect(
      sprout.pricing.find((p) => p.label === "Monthly subscription")?.regular,
    ).toBe("R399/month");
    expect(sprout.maximumCustomers).toBe(100);
    expect(
      sprout.pricing.find((p) => p.label === "Additional pages")?.regular,
    ).toContain("R150/month");
  });

  it("emits canonical + OG + Twitter for promotion detail pages", () => {
    const source = readSource("app/promotions/[slug]/page.tsx");
    expect(source).toContain("alternates");
    expect(source).toContain("canonical");
    expect(source).toContain("openGraph");
    expect(source).toContain("twitter");
    expect(source).toContain("siteConfig.url");
  });
});

describe("task 8 — article metadata", () => {
  it("emits canonical + article OG + Article JSON-LD per post", () => {
    // The detail route delegates to the shared MDX metadata helper, which
    // builds canonical + article OG + Article JSON-LD from frontmatter.
    const route = readSource("app/articles/[slug]/page.tsx");
    expect(route).toContain("articleMetadata");
    expect(route).toContain("articleJsonLd");
    const helper = readSource("lib/articles/metadata.ts");
    // Canonical + OG come from the shared pageMetadata helper (which sets
    // `alternates` from the configured site URL — see lib/seo.ts).
    expect(helper).toContain("pageMetadata");
    expect(helper).toContain("canonicalUrl");
    expect(readSource("lib/seo.ts")).toContain("alternates");
    expect(helper).toContain('"article"');
    expect(helper).toContain('"Article"');
    expect(helper).toContain("datePublished");
  });

  it("gives every article a unique title and description", () => {
    const titles = new Set(POSTS.map((p) => p.title));
    expect(titles.size).toBe(POSTS.length);
    for (const post of POSTS) {
      expect(post.excerpt.length).toBeGreaterThan(20);
    }
  });
});

describe("task 8 — invalid dynamic routes return not-found", () => {
  it("wires notFound() for unknown service, article and promotion slugs", () => {
    expect(getService("nonexistent-service")).toBeUndefined();
    expect(getPost("nonexistent-article")).toBeUndefined();
    expect(getPromotionBySlug("nonexistent-promotion")).toBeUndefined();
    for (const file of [
      "app/services/[slug]/page.tsx",
      "app/articles/[slug]/page.tsx",
      "app/promotions/[slug]/page.tsx",
    ]) {
      expect(readSource(file)).toContain("notFound()");
    }
    expect(readSource("app/not-found.tsx")).toContain("Page not found");
  });
});

describe("task 8 — no stale subsidiary claim in source", () => {
  it("contains no 'Mogen Subsidiary Proj' wording", () => {
    for (const file of [
      "components/mogen/portfolio.tsx",
      "app/page.tsx",
      "data/site.ts",
    ]) {
      expect(readSource(file)).not.toContain("Mogen Subsidiary Proj");
    }
    expect(readSource("components/mogen/portfolio.tsx")).not.toContain(
      "Subsidiary",
    );
  });
});

describe("task 8 — pageMetadata helper", () => {
  it("builds consistent canonical + OG metadata", () => {
    const meta = pageMetadata({
      path: "/services/seo?utm_source=x",
      title: "SEO",
      description: "Local SEO that gets you found.",
    });
    expect(meta.alternates?.canonical).toBe(`${getSiteUrl()}/services/seo`);
    const og = meta.openGraph as { url?: string; title?: string };
    expect(og.url).toBe(`${getSiteUrl()}/services/seo`);
    expect(og.title).toBe("SEO");
    expect(SERVICES.map((s) => s.slug)).toEqual([
      "web-development",
      "seo",
      "digital-marketing",
      "business-documentation",
    ]);
  });
});
