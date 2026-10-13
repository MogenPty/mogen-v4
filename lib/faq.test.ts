import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import sitemap from "@/app/sitemap";
import { SERVICES } from "@/data/services";
import { getSiteUrl } from "@/data/site";

function readSource(relativePath: string): string {
  return readFileSync(join(process.cwd(), relativePath), "utf8");
}

describe("faq — directory route", () => {
  it("implements a public /faq directory with canonical metadata", () => {
    const page = readSource("app/faq/page.tsx");
    expect(page).toContain('path: "/faq"');
    expect(page).toContain("pageMetadata");
    expect(page).toContain("Frequently Asked Questions");
    expect(page).toContain("revalidate");
    expect(page).not.toContain("www.mogen.co.za");
  });

  it("renders verified service FAQs (no invented commercial terms)", () => {
    const page = readSource("app/faq/page.tsx");
    // Content comes from the existing service data — never duplicated copy.
    expect(page).toContain("SERVICES");
    expect(page).toContain("ServiceFAQ");
    for (const service of SERVICES) {
      expect(service.faq?.length).toBeGreaterThan(0);
      for (const item of service.faq ?? []) {
        expect(item.question.length).toBeGreaterThan(0);
        expect(item.answer.length).toBeGreaterThan(0);
      }
    }
    // The directory points at pricing — it never states prices itself.
    for (const price of ["R199", "R900", "R299", "R8,500", "R1,900"]) {
      expect(page).not.toContain(price);
    }
  });

  it("emits FAQPage structured data", () => {
    const page = readSource("app/faq/page.tsx");
    expect(page).toContain("FAQPage");
    expect(page).toContain("mainEntity");
    expect(page).toContain("acceptedAnswer");
  });

  it("navigates between the directory and service, pricing and contact pages", () => {
    const page = readSource("app/faq/page.tsx");
    // Service links render from SERVICES via template hrefs.
    expect(page).toContain("SERVICES.map");
    expect(page).toContain("/services/${service.slug}");
    expect(page).toContain("/services/${service.slug}#pricing");
    expect(page).toContain('href="/pricing"');
    expect(page).toContain('href="/contact"');
    expect(page).toContain('href="/promotions"');
    // Service pages and the pricing directory link back to the directory.
    expect(readSource("components/mogen/service-detail.tsx")).toContain(
      'href="/faq"',
    );
    expect(readSource("app/pricing/page.tsx")).toContain('href="/faq"');
  });

  it("is discoverable via sitemap and footer", () => {
    const urls = sitemap().map((e) => e.url);
    expect(urls).toContain(`${getSiteUrl()}/faq`);
    expect(readSource("components/mogen/footer.tsx")).toContain('"/faq"');
    expect(readSource("components/mogen/nav.tsx")).toContain('"/faq"');
  });
});
