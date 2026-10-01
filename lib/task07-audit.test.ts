import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { getPromotionBySlug } from "@/data/promotions";
import { SERVICES } from "@/data/services";
import { buildEnquiryHref } from "@/lib/enquiry/enquiry";

function readSource(relativePath: string): string {
  return readFileSync(join(process.cwd(), relativePath), "utf8");
}

/**
 * Task 07 — launch-critical audit corrections.
 *
 * Guards the specific bugs fixed during the audit: obsolete contact email,
 * obsolete branding/service references, Growth Audit control defects, and
 * the broken results-page pricing CTA. Behavioural contracts (service CTA
 * routing, promotion CTA routing, attribution, featuring) remain covered by
 * their Task 01–06 suites.
 */
describe("task 07 — public contact email", () => {
  it.each([
    "app/privacy-policy/page.tsx",
    "app/terms-of-service/page.tsx",
    "components/mogen/service-quote-form.tsx",
    "components/mogen/resources-block.tsx",
  ])("%s uses info@mogen.co.za, not the obsolete hello@ address", (file) => {
    const source = readSource(file);
    expect(source).not.toContain("hello@mogen.co.za");
    expect(source).toContain("info@mogen.co.za");
  });
});

describe("task 07 — public branding and service references", () => {
  it("about metadata uses the public brand, not legacy company names", () => {
    const source = readSource("app/about/page.tsx");
    expect(source).not.toContain("Mogen Pty Ltd (Motsoane Global Enterprise)");
  });

  it("service detail title does not reference an obsolete brand service", () => {
    // Title moved to server metadata in Task 8 (`app/services/[slug]`
    // generateMetadata); the brand descriptor lives in the site config
    // consumed by the layout default title.
    const source =
      readSource("components/mogen/service-detail.tsx") +
      readSource("app/services/[slug]/page.tsx") +
      readSource("data/site.ts");
    expect(source).not.toContain("Brand & SEO Agency");
    expect(source).toContain("Digital Services for South African Businesses");
  });
});

describe("task 07 — growth audit controls", () => {
  it("defaults service interest to a valid public service slug", () => {
    const source = readSource("components/mogen/growth-audit.tsx");
    expect(source).not.toContain("Full Growth Package");
    const slugs = SERVICES.map((s) => s.slug);
    const match = source.match(/service_interest:\s*"([^"]+)"/);
    expect(match).not.toBeNull();
    expect(slugs).toContain(match![1]);
  });

  it("has no non-functional duplicate service selector", () => {
    const source = readSource("components/mogen/growth-audit.tsx");
    expect(source).not.toContain("<Select>");
    expect(source).not.toContain("<SelectItem");
    expect(source).not.toContain(">Test</SelectItem>");
  });

  it("labels form fields with stable ids", () => {
    const source = readSource("components/mogen/growth-audit.tsx");
    expect(source).not.toMatch(/htmlFor=\{value\}/);
    expect(source).toContain("htmlFor={id}");
  });

  it("results CTA targets the pricing directory, not a missing homepage anchor", () => {
    const source = readSource("components/mogen/growth-audit-results.tsx");
    expect(source).not.toContain('href="/#pricing"');
    expect(source).toContain('href="/pricing"');
  });
});

describe("task 07 — contact page phone details", () => {
  it("shows both public phone numbers with tel: links", () => {
    const source = readSource("components/mogen/contact.tsx");
    expect(source).toContain("siteConfig.telephoneDisplay");
    expect(source).toContain("siteConfig.alternativeTelephoneDisplay");
    expect(source).toContain("tel:${siteConfig.telephone}");
    expect(source).toContain("tel:${siteConfig.alternativeTelephone}");
  });
});

describe("task 07 — sprout promotion data unchanged", () => {
  it("keeps the agreed sprout pricing and associations", () => {
    const sprout = getPromotionBySlug("mogen-sprout-first-100")!;
    expect(sprout.relatedService).toBe("web-development");
    expect(sprout.maximumCustomers).toBe(100);
    expect(sprout.promoDurationMonths).toBe(12);
    const byLabel = Object.fromEntries(
      sprout.pricing.map((p) => [p.label, p]),
    );
    expect(byLabel["Setup fee"].promotional).toBe("R900");
    expect(byLabel["Setup fee"].regular).toBe("R1,200");
    expect(byLabel["Monthly subscription"].promotional).toBe("R299/month");
    expect(byLabel["Monthly subscription"].regular).toBe("R399/month");
    expect(sprout.savingsCallout).toContain("R4,488");
    expect(sprout.savingsCallout).toContain("R5,988");
    expect(sprout.savingsCallout).toContain("R1,500");
  });

  it("routes the sprout CTA with promotion-only context resolving to web-development", () => {
    const sprout = getPromotionBySlug("mogen-sprout-first-100")!;
    const href = buildEnquiryHref({
      promotion: sprout.slug,
    });
    const params = new URLSearchParams(href.split("?")[1]);
    expect(params.get("promotion")).toBe("mogen-sprout-first-100");
    expect(params.has("service")).toBe(false);
  });
});
