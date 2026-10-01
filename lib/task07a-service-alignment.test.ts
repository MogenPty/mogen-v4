import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { getPromotionBySlug } from "@/data/promotions";
import { getService, SERVICES } from "@/data/services";
import { CONTACT_SERVICES } from "@/lib/contact/contact-service";
import { buildEnquiryHref } from "@/lib/enquiry/enquiry";

function readSource(relativePath: string): string {
  return readFileSync(join(process.cwd(), relativePath), "utf8");
}

/**
 * Task 7A — Service & Pricing Alignment.
 *
 * Guards the aligned catalogue: four current services in canonical order,
 * pricing consumed from the single source (data/services.ts), enquiry
 * routing unchanged, and promotion pricing kept separate from normal
 * service pricing. Does not assert SEO/metadata strategy (Task 08).
 */
describe("task 7A — current service catalogue", () => {
  it("exposes exactly the four current services in canonical order", () => {
    expect(SERVICES.map((s) => s.slug)).toEqual([
      "web-development",
      "seo",
      "digital-marketing",
      "business-documentation",
    ]);
    expect(SERVICES.map((s) => s.name)).toEqual([
      "Web Development",
      "SEO",
      "Digital Marketing",
      "Business Documentation",
    ]);
  });

  it("contains no obsolete public service slugs or names", () => {
    const slugs = SERVICES.map((s) => s.slug).join(" ");
    const names = SERVICES.map((s) => s.name).join(" ");
    for (const obsolete of [
      "mobile",
      "brand-identity",
      "logo-design",
      "seo-services",
    ]) {
      expect(slugs).not.toContain(obsolete);
    }
    for (const obsolete of [
      "Mobile Development",
      "Mobile App Development",
      "Brand Identity",
      "Logo Design",
      "SEO Services",
    ]) {
      expect(names).not.toContain(obsolete);
    }
  });

  it("resolves each service page slug to the correct service data", () => {
    for (const [slug, name] of [
      ["web-development", "Web Development"],
      ["seo", "SEO"],
      ["digital-marketing", "Digital Marketing"],
      ["business-documentation", "Business Documentation"],
    ] as const) {
      expect(getService(slug)?.name).toBe(name);
    }
    expect(getService("mobile-development")).toBeUndefined();
  });
});

describe("task 7A — web development packages", () => {
  it("uses the current Seed/Sprout/Vegetative structure and pricing", () => {
    const web = getService("web-development")!;
    expect(web.pricing?.map((p) => p.name)).toEqual([
      "Seed",
      "Sprout",
      "Vegetative",
    ]);
    const byName = Object.fromEntries(web.pricing!.map((p) => [p.name, p]));
    expect(byName["Seed"].price).toBe("R199");
    expect(byName["Sprout"].price).toBe("R399");
    expect(byName["Vegetative"].price).toBe("R1,500");
    expect(web.pricing?.map((p) => p.packageId)).toEqual([
      "seed",
      "sprout",
      "vegetative",
    ]);
  });

  it("aligns Seed/Sprout benefits with their promotions without promo pricing", () => {
    const web = getService("web-development")!;
    const byName = Object.fromEntries(web.pricing!.map((p) => [p.name, p]));
    for (const item of getPromotionBySlug("mogen-seed-r99")!.included!) {
      expect(byName["Seed"].features).toContain(item);
    }
    for (const item of getPromotionBySlug("mogen-sprout-first-100")!.included!) {
      expect(byName["Sprout"].features).toContain(item);
    }
  });

  it("uses normal (regular) costs in packages, never promotional pricing", () => {
    const allText = SERVICES.flatMap((s) => [
      ...(s.pricing ?? []).map((p) => p.price),
      ...(s.pricing ?? []).flatMap((p) => p.features),
    ]).join(" ");
    // Promotional values stay promotion-specific.
    for (const promoPrice of ["R900", "R299/month"]) {
      expect(allText).not.toContain(promoPrice);
    }
    // Normal costs from the promotions are the package source of truth.
    expect(allText).toContain("R199");
    expect(allText).toContain("R1,200");
    expect(allText).toContain("R399");
  });
});

describe("task 7A — obsolete generic pricing removed", () => {
  it("deletes the dead Ignite/Grow/Dominate generic pricing source", () => {
    expect(existsSync(join(process.cwd(), "components/mogen/pricing.tsx"))).toBe(
      false,
    );
  });

  it("keeps no Ignite/Grow/Dominate bundle references in app or components", () => {
    for (const file of [
      "app/page.tsx",
      "app/pricing/page.tsx",
      "app/services/page.tsx",
      "components/mogen/services.tsx",
      "components/mogen/service-detail.tsx",
      "components/mogen/service-pricing.tsx",
    ]) {
      const source = readSource(file);
      expect(source).not.toContain("Start Ignite");
      expect(source).not.toContain("Scale to Grow");
      expect(source).not.toContain("Dominate Gauteng");
    }
  });
});

describe("task 7A — service consumers stay consistent", () => {
  it("derives contact options from the canonical list in canonical order", () => {
    expect([...CONTACT_SERVICES]).toEqual([
      "Web Development",
      "SEO",
      "Digital Marketing",
      "Business Documentation",
      "Other",
    ]);
  });

  it("lists nav and footer services in canonical order", () => {
    for (const file of ["components/mogen/nav.tsx", "components/mogen/footer.tsx"]) {
      const source = readSource(file);
      const order = [
        source.indexOf("/services/web-development"),
        source.indexOf("/services/seo"),
        source.indexOf("/services/digital-marketing"),
        source.indexOf("/services/business-documentation"),
      ];
      expect(order.every((i) => i >= 0)).toBe(true);
      expect([...order].sort((a, b) => a - b)).toEqual(order);
    }
  });

  it("routes service CTAs through the Task 02 enquiry mechanism", () => {
    for (const slug of [
      "web-development",
      "seo",
      "digital-marketing",
      "business-documentation",
    ]) {
      const params = new URLSearchParams(
        buildEnquiryHref({ service: slug }).split("?")[1],
      );
      expect(params.get("service")).toBe(slug);
    }
  });

  it("keeps the Sprout promotion CTA promotion-only, resolving centrally", () => {
    const href = buildEnquiryHref({
      promotion: "mogen-sprout-first-100",
    });
    const params = new URLSearchParams(href.split("?")[1]);
    expect(params.get("promotion")).toBe("mogen-sprout-first-100");
    expect(params.has("service")).toBe(false);
  });
});

describe("task 7A — promotion/service separation", () => {
  it("keeps Sprout promotion pricing authoritative and separate", () => {
    const sprout = getPromotionBySlug("mogen-sprout-first-100")!;
    expect(sprout.relatedService).toBe("web-development");
    const byLabel = Object.fromEntries(sprout.pricing.map((p) => [p.label, p]));
    expect(byLabel["Setup fee"].promotional).toBe("R900");
    expect(byLabel["Setup fee"].regular).toBe("R1,200");
    expect(byLabel["Monthly subscription"].promotional).toBe("R299/month");
    expect(byLabel["Monthly subscription"].regular).toBe("R399/month");
  });

  it("keeps Seed promotion pricing authoritative and separate", () => {
    const seed = getPromotionBySlug("mogen-seed-r99")!;
    expect(seed.pricing[0].regular).toBe("R199");
    expect(seed.pricing[0].promotional).toBe("R99");
  });
});
