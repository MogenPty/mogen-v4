import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import {
  formatPromotionPrice,
  getFeaturedPricePoint,
  getPromotionBySlug,
  needsCadenceSuffix,
} from "@/data/promotions";
import { getService, SERVICES } from "@/data/services";
import { getPackage } from "@/data/packages";
import {
  ACCENT_INIT_SCRIPT,
  ACCENT_STORAGE_KEY,
  DEFAULT_ACCENT,
  isAccent,
  normalizeAccent,
} from "@/lib/accent";
import { getSiteUrl } from "@/data/site";
import {
  buildEnquiryHref,
  parseEnquiryContext,
  resolveEnquiryDetails,
} from "@/lib/enquiry/enquiry";

function readSource(relativePath: string): string {
  return readFileSync(join(process.cwd(), relativePath), "utf8");
}

/** Convert integer HSL to a lowercase hex string (for token assertions). */
function hslToHex(h: number, s: number, l: number): string {
  const sn = s / 100;
  const ln = l / 100;
  const c = (1 - Math.abs(2 * ln - 1)) * sn;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = ln - c / 2;
  let r = 0;
  let g = 0;
  let b = 0;
  if (h < 60) {
    r = c;
    g = x;
  } else if (h < 120) {
    r = x;
    g = c;
  } else if (h < 180) {
    g = c;
    b = x;
  } else if (h < 240) {
    g = x;
    b = c;
  } else if (h < 300) {
    r = x;
    b = c;
  } else {
    r = c;
    b = x;
  }
  const toHex = (v: number) =>
    Math.round((v + m) * 255)
      .toString(16)
      .padStart(2, "0");
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

function walkPublicSources(
  dir: string,
  acc: string[] = [],
): string[] {
  for (const entry of readdirSync(dir)) {
    if (entry === "node_modules" || entry === ".next" || entry === ".git")
      continue;
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) {
      walkPublicSources(full, acc);
    } else if (/\.(tsx?|mdx?|json)$/.test(entry) && !/\.log$/.test(entry)) {
      acc.push(full);
    }
  }
  return acc;
}

describe("task 7B — promotion pricing never duplicates /month", () => {
  it("formats monthly values without a duplicate suffix", () => {
    expect(formatPromotionPrice("R299/month", "/month")).toBe("R299/month");
    expect(formatPromotionPrice("R399/month", "/month")).toBe("R399/month");
    expect(formatPromotionPrice("R299", "/month")).toBe("R299/month");
    expect(formatPromotionPrice("R900", "once-off")).toBe("R900 once-off");
    expect(
      formatPromotionPrice("R150/month", "per additional 5 pages"),
    ).toBe("R150/month per additional 5 pages");
    expect(formatPromotionPrice("R99", undefined)).toBe("R99");
  });

  it("suppresses a separate cadence element when the value carries its period", () => {
    expect(needsCadenceSuffix("R299/month", "/month")).toBe(false);
    expect(needsCadenceSuffix("R299/month", undefined)).toBe(false);
    expect(needsCadenceSuffix("R299", "/month")).toBe(true);
    expect(needsCadenceSuffix("R900", "once-off")).toBe(true);
    expect(needsCadenceSuffix("R150/month", "per additional 5 pages")).toBe(
      true,
    );
  });

  it("keeps Sprout monthly data rendering as R299/month and R399/month", () => {
    const sprout = getPromotionBySlug("mogen-sprout-first-100")!;
    const monthly = sprout.pricing.find(
      (p) => p.label === "Monthly subscription",
    )!;
    // Actual prices unchanged — only the duplicated cadence was removed.
    expect(monthly.promotional).toBe("R299/month");
    expect(monthly.regular).toBe("R399/month");
    expect(
      formatPromotionPrice(monthly.promotional!, monthly.cadence),
    ).toBe("R299/month");
    expect(formatPromotionPrice(monthly.regular, monthly.cadence)).toBe(
      "R399/month",
    );
    expect(
      `${formatPromotionPrice(monthly.promotional!, monthly.cadence)} ${formatPromotionPrice(monthly.regular, monthly.cadence)}`,
    ).not.toContain("/month/month");
  });

  it("renders every promotion price line without /month/month", () => {
    const sprout = getPromotionBySlug("mogen-sprout-first-100")!;
    for (const p of sprout.pricing) {
      const promo = p.promotional
        ? formatPromotionPrice(p.promotional, p.cadence)
        : null;
      const regular = formatPromotionPrice(p.regular, p.cadence);
      expect(`${promo ?? ""} ${regular}`).not.toContain("/month/month");
    }
  });
});

describe("task 7B — Sprout email wording", () => {
  it("promises up to 5 email accounts, not Mogen email services", () => {
    const sprout = getPromotionBySlug("mogen-sprout-first-100")!;
    expect(sprout.included).toContain("Up to 5 email accounts");
    expect(sprout.included!.join(" ")).not.toContain(
      "Mogen email services available",
    );
    expect(sprout.included!.join(" ").toLowerCase()).not.toContain(
      "mogen email accounts",
    );
  });

  it("mirrors the wording in the Sprout service package", () => {
    const sprout = getService("web-development")!.pricing!.find(
      (p) => p.packageId === "sprout",
    )!;
    expect(sprout.features).toContain("Up to 5 email accounts");
    expect(sprout.features.join(" ")).not.toContain(
      "Mogen email services available",
    );
  });

  it("uses no 'Mogen email accounts' phrasing in public data", () => {
    for (const file of ["data/promotions.ts", "data/services.ts"]) {
      expect(readSource(file).toLowerCase()).not.toContain(
        "mogen email accounts",
      );
    }
  });
});

describe("task 7B — once-off vs monthly additional-page pricing", () => {
  it("keeps the normal Extra page add-on once-off at R650", () => {
    const web = getService("web-development")!;
    const extra = web.addons!.find((a) => a.name === "Extra page")!;
    expect(extra.price).toBe("R650");
    expect(extra.price).not.toContain("/month");
    expect(extra.price).not.toContain("/ mo");
    expect(extra.desc.toLowerCase()).toContain("once-off");
    expect(extra.desc).not.toContain("/month");
  });

  it("keeps Sprout additional pages recurring at R150/month", () => {
    const sprout = getPromotionBySlug("mogen-sprout-first-100")!;
    const additional = sprout.pricing.find(
      (p) => p.label === "Additional pages",
    )!;
    expect(additional.regular).toContain("R150/month");
    expect(additional.cadence).toContain("per additional 5 pages");
    expect(
      formatPromotionPrice(additional.regular, additional.cadence),
    ).toContain("R150/month");
  });
});

describe("task 7B — environment-driven public URL", () => {
  const KEY = "NEXT_PUBLIC_SITE_URL";

  afterEach(() => {
    delete process.env[KEY];
  });

  it("defaults to production when the env var is unset", () => {
    delete process.env[KEY];
    expect(getSiteUrl()).toBe("https://www.mogen.co.za");
  });

  it("follows NEXT_PUBLIC_SITE_URL for other deployment domains", () => {
    process.env[KEY] = "https://mogen-v4.vercel.app";
    expect(getSiteUrl()).toBe("https://mogen-v4.vercel.app");
    process.env[KEY] = "https://example.com/";
    expect(getSiteUrl()).toBe("https://example.com");
  });

  it("derives robots/sitemap/canonical/OG/JSON-LD from configuration", () => {
    for (const file of [
      "app/robots.ts",
      "app/sitemap.ts",
      "app/layout.tsx",
      "app/page.tsx",
      "components/mogen/json-ld.tsx",
      "components/mogen/service-detail.tsx",
      "lib/campaign/campaign.ts",
    ]) {
      expect(readSource(file)).toContain("siteConfig.url");
    }
    // No reusable SEO infrastructure hardcodes the production host.
    for (const file of [
      "app/robots.ts",
      "app/sitemap.ts",
      "app/layout.tsx",
      "components/mogen/json-ld.tsx",
      "components/mogen/service-detail.tsx",
      "lib/campaign/campaign.ts",
    ]) {
      expect(readSource(file)).not.toContain("https://www.mogen.co.za");
    }
  });

  it("documents the variable without committing a secret", () => {
    const example = readSource(".env.example");
    expect(example).toContain("NEXT_PUBLIC_SITE_URL");
    expect(example).toContain("https://mogen-v4.vercel.app");
  });
});

describe("task 7B — no public WaaS references", () => {
  it("finds no WaaS marketing in public sources", () => {
    const roots = ["app", "components", "data"].map((d) =>
      join(process.cwd(), d),
    );
    const files = roots.flatMap((r) => walkPublicSources(r));
    expect(files.length).toBeGreaterThan(0);
    const offenders: string[] = [];
    for (const file of files) {
      const source = readFileSync(file, "utf8");
      if (
        /waas/i.test(source) ||
        /website-as-a-service/i.test(source) ||
        /website as a service/i.test(source)
      ) {
        offenders.push(file);
      }
    }
    expect(offenders).toEqual([]);
  });
});

describe("task 7B — green default accent, orange retained", () => {
  it("defaults to green and accepts orange as the alternative", () => {
    expect(DEFAULT_ACCENT).toBe("green");
    expect(normalizeAccent(undefined)).toBe("green");
    expect(normalizeAccent("bogus")).toBe("green");
    expect(normalizeAccent("orange")).toBe("orange");
    expect(isAccent("green")).toBe(true);
    expect(isAccent("orange")).toBe(true);
    expect(isAccent("volt")).toBe(false);
  });

  it("persists the accent without a backend", () => {
    expect(ACCENT_STORAGE_KEY).toBe("mogen-accent");
    expect(ACCENT_INIT_SCRIPT).toContain("mogen-accent");
    expect(ACCENT_INIT_SCRIPT).toContain("green");
  });

  it("uses one shared green (#247F52) in both light and dark modes", () => {
    const css = readSource("app/globals.css");
    // Single base-green token — no separate light/dark base greens.
    expect(css).toContain("--accent-green: 150 56% 32%");
    // hsl(150 56% 32%) === #247F52 (single leafy green, both modes).
    expect(hslToHex(150, 56, 32)).toBe("#247f52");
    // Both modes map the semantic tokens to the shared token.
    expect(css).toContain("--accent: var(--accent-green)");
    expect(css).toContain("--catalyst: var(--accent-green)");
    expect(css).toContain("--ring: var(--accent-green)");
    // Old separate light/dark greens are gone.
    expect(css).not.toContain("152 60% 30%");
    expect(css).not.toContain("152 45% 55%");
    expect(css).not.toContain("152 65% 24%");
    expect(css).not.toContain("152 50% 62%");
    expect(css).not.toMatch(/--accent:\s*75/);
    // Accent state tokens still exist for hover/focus treatments.
    expect(css).toContain("--accent-hover:");
    expect(css).toContain("--accent-muted:");
    expect(css).toContain("--accent-border:");
    // Orange retained as a selectable alternative.
    expect(css).toContain('[data-accent="orange"]');
    expect(css).toContain("--accent: 22 100% 50%");
    expect(css).toContain(".dark[data-accent");
  });

  it("exposes the accent selector in the appearance UI", () => {
    const toggle = readSource("components/mogen/theme-toggle.tsx");
    expect(toggle).toContain("Accent");
    expect(toggle).toContain("green");
    expect(toggle).toContain("orange");
    expect(toggle).toContain("setStoredAccent");
    // Light/dark/system behaviour is preserved, not replaced.
    expect(toggle).toContain("light");
    expect(toggle).toContain("dark");
    expect(toggle).toContain("system");
  });

  it("sets green as the default accent in the document", () => {
    const layout = readSource("app/layout.tsx");
    expect(layout).toContain("data-accent");
    expect(layout).toContain("DEFAULT_ACCENT");
    expect(layout).toContain("ACCENT_INIT_SCRIPT");
  });

  it("keeps buttons context-safe with surface-aware hover", () => {
    const button = readSource("components/mogen/magnet-button.tsx");
    // Primary CTA hover deepens the accent instead of flipping to global ink.
    expect(button).toContain("hover:bg-catalyst-hover");
    expect(button).not.toContain("bg-catalyst text-white hover:bg-ink");
    // No global-theme (`dark:`) override on the green CTA: the shared
    // #247F52 keeps white text (~5:1) in both modes, so the button resolves
    // against its local container surface, not the page theme.
    const catalystLine = button
      .split("\n")
      .find((line) => line.includes("bg-catalyst text-white hover:bg-catalyst-hover"));
    expect(catalystLine).toBeDefined();
    expect(catalystLine).not.toContain("dark:");
    // Explicit surface contexts pin the local container (light card in
    // dark page, dark card in light page, promotion/package/CTA cards).
    expect(button).toContain("ButtonSurface");
    expect(button).toContain('surface?: ButtonSurface');
    expect(button).toContain("surface-light");
    expect(button).toContain("surface-dark");
    expect(button).toContain("on-light");
    expect(button).toContain("on-dark");
    expect(button).toContain("data-surface");
    // Accessibility states preserved.
    expect(button).toContain("focus-visible");
    expect(button).toContain("disabled:");
    const css = readSource("app/globals.css");
    expect(css).toContain(".surface-light");
    expect(css).toContain(".surface-dark");
  });
});

describe("featured promotion price point", () => {
  it("features Sprout's monthly subscription, not the setup fee", () => {
    const sprout = getPromotionBySlug("mogen-sprout-first-100")!;
    const featured = getFeaturedPricePoint(sprout)!;
    expect(featured.label).toBe("Monthly subscription");
    expect(featured.promotional).toBe("R299/month");
    expect(featured.regular).toBe("R399/month");
  });

  it("falls back to the first discounted entry when nothing is flagged", () => {
    const seed = getPromotionBySlug("mogen-seed-r99")!;
    expect(seed.pricing.some((p) => p.featured)).toBe(false);
    const featured = getFeaturedPricePoint(seed)!;
    expect(featured.promotional).toBe("R99");
    expect(featured.regular).toBe("R199");
  });

  it("renders the homepage headline with its cadence", () => {
    const source = readSource("components/mogen/promotion.tsx");
    expect(source).toContain("getFeaturedPricePoint");
    expect(source).toContain("needsCadenceSuffix");
    expect(source).toContain("headline.cadence");
  });
});

describe("task 7B — package structure and enquiry context preserved", () => {  it("keeps the locked catalogue names, order and key prices", () => {
    expect(SERVICES.map((s) => s.slug)).toEqual([
      "web-development",
      "seo",
      "digital-marketing",
      "business-documentation",
    ]);
    const web = getService("web-development")!;
    expect(web.pricing?.map((p) => p.name)).toEqual([
      "Seed",
      "Sprout",
      "Vegetative",
    ]);
    const veg = web.pricing!.find((p) => p.packageId === "vegetative")!;
    expect(veg.features).toContain("R2,000 once-off setup fee");
    expect(veg.price).toBe("R1,500");
    const seo = getService("seo")!;
    expect(seo.pricing?.map((p) => p.name)).toEqual([
      "Ignition",
      "Scale",
      "Dominance",
    ]);
    expect(seo.pricing?.[0].features).toContain("Core 17 of 37 steps");
    expect(
      getService("digital-marketing")!.pricing?.map((p) => p.name),
    ).toEqual(["Starter", "Growth", "Dominate"]);
    expect(
      getService("business-documentation")!.pricing?.map((p) => p.name),
    ).toEqual(["Essential", "Standard", "Complete"]);
    const complete = getService("business-documentation")!.pricing!.find(
      (p) => p.packageId === "complete",
    )!;
    expect(complete.price).toBe("From R4,900");
    expect(complete.features).toContain("Document pack (from 4 documents)");
    for (const tier of web.pricing!) {
      expect(getPackage(tier.packageId)?.serviceSlug).toBe("web-development");
    }
  });

  it("resolves promotion-only URLs to package + service without redundancy", () => {
    const href = buildEnquiryHref({ promotion: "mogen-sprout-first-100" });
    expect(href).toBe("/contact?promotion=mogen-sprout-first-100");
    const details = resolveEnquiryDetails(parseEnquiryContext(new URLSearchParams(href.split("?")[1])));
    expect(details.promotion?.slug).toBe("mogen-sprout-first-100");
    expect(details.package?.id).toBe("sprout");
    expect(details.serviceName).toBe("Web Development");
  });

  it("resolves package-only URLs to the inferred service", () => {
    expect(buildEnquiryHref({ package: "sprout" })).toBe(
      "/contact?package=sprout",
    );
    const details = resolveEnquiryDetails(
      parseEnquiryContext(new URLSearchParams("package=sprout")),
    );
    expect(details.package?.id).toBe("sprout");
    expect(details.serviceName).toBe("Web Development");
  });

  it("carries UTM attribution alongside inferred context", () => {
    const href = buildEnquiryHref({
      promotion: "mogen-sprout-first-100",
      attribution: { utm_source: "whatsapp" },
    });
    const details = resolveEnquiryDetails(
      parseEnquiryContext(new URLSearchParams(href.split("?")[1])),
    );
    expect(details.package?.id).toBe("sprout");
    expect(details.attribution).toEqual({ utm_source: "whatsapp" });
  });
});
