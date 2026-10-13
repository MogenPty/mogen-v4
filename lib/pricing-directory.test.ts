import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { getPackage } from "@/data/packages";
import { getService, SERVICES } from "@/data/services";

function readSource(relativePath: string): string {
  return readFileSync(join(process.cwd(), relativePath), "utf8");
}

describe("pricing — directory stays a navigator (no duplicated tables)", () => {
  it("links every service to its authoritative pricing anchor", () => {
    const page = readSource("app/pricing/page.tsx");
    // Links render from SERVICES via template hrefs — one pricing anchor
    // and one overview link per service.
    expect(page).toContain("SERVICES.map");
    expect(page).toContain("/services/${svc.slug}#pricing");
    expect(page).toContain("/services/${svc.slug}");
    expect(page).toContain("authoritative");
  });

  it("duplicates no package content or prices", () => {
    const page = readSource("app/pricing/page.tsx");
    expect(page).not.toContain("ServicePricing");
    for (const price of [
      "R199",
      "R399",
      "R1,500",
      "R8,500",
      "R16,500",
      "R32,000",
      "R3,500",
      "R7,500",
      "R1,900",
      "R4,500",
    ]) {
      expect(page).not.toContain(price);
    }
  });

  it("keeps canonical metadata and cross-links to FAQ", () => {
    const page = readSource("app/pricing/page.tsx");
    expect(page).toContain('path: "/pricing"');
    expect(page).toContain("pageMetadata");
    expect(page).toContain('title: "Pricing"');
    expect(page).toContain('href="/faq"');
  });

  it("is reachable from the header and footer navigation", () => {
    expect(readSource("components/mogen/nav.tsx")).toContain('"/pricing"');
    expect(readSource("components/mogen/footer.tsx")).toContain('"/pricing"');
  });
});

describe("pricing — service pages remain the price authority", () => {
  it("renders pricing anchors backed by the service data", () => {
    const detail = readSource("components/mogen/service-detail.tsx");
    expect(detail).toContain('id={"pricing"}');
    expect(detail).toContain("ServicePricing");
  });

  it("keeps every package identifier resolving to its owning service", () => {
    for (const service of SERVICES) {
      for (const tier of service.pricing ?? []) {
        const pkg = getPackage(tier.packageId);
        expect(pkg?.serviceSlug).toBe(service.slug);
      }
    }
  });

  it("keeps the approved package prices unchanged", () => {
    const web = getService("web-development")!;
    expect(
      web.pricing?.find((p) => p.packageId === "seed")?.price,
    ).toBe("R199");
    expect(
      web.pricing?.find((p) => p.packageId === "sprout")?.price,
    ).toBe("R399");
    expect(
      web.pricing
        ?.find((p) => p.packageId === "sprout")
        ?.features.join(" "),
    ).toContain("R1,200 once-off setup fee");
    expect(
      web.pricing?.find((p) => p.packageId === "vegetative")?.price,
    ).toBe("R1,500");
    expect(getService("seo")?.pricing?.[0].price).toBe("R8,500");
    expect(
      getService("business-documentation")?.pricing?.find(
        (p) => p.packageId === "complete",
      )?.price,
    ).toBe("From R4,900");
  });
});
