import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import sitemap from "@/app/sitemap";
import { getLocationDetail, LOCATIONS, LOCATION_SLUGS } from "@/data/locations";
import { getSiteUrl } from "@/data/site";

function readSource(relativePath: string): string {
  return readFileSync(join(process.cwd(), relativePath), "utf8");
}

describe("locations — data source", () => {
  it("keeps the two real location pages available", () => {
    expect(LOCATION_SLUGS).toEqual(
      expect.arrayContaining(["maboloka", "soshanguve"]),
    );
    expect(getLocationDetail("maboloka")?.name).toBe("Maboloka");
    expect(getLocationDetail("soshanguve")?.name).toBe("Soshanguve");
    expect(getLocationDetail("no-such-place")).toBeUndefined();
  });

  it("reuses existing location data (no duplicated copy)", () => {
    const page = readSource("app/locations/page.tsx");
    expect(page).toContain("data/locations");
    expect(page).toContain("LOCATION_SLUGS");
    expect(page).toContain("LOCATIONS");
  });
});

describe("locations — index route", () => {
  it("implements a public /locations directory with canonical metadata", () => {
    const page = readSource("app/locations/page.tsx");
    expect(page).toContain('path: "/locations"');
    expect(page).toContain("pageMetadata");
    expect(page).toContain('title: "Locations"');
    expect(page).not.toContain("www.mogen.co.za");
  });

  it("links to the real existing location pages", () => {
    const page = readSource("app/locations/page.tsx");
    expect(page).toContain("/locations/${");
    expect(page).toContain("View location");
  });

  it("invents no locations, addresses, offices or testimonials", () => {
    const page = readSource("app/locations/page.tsx");
    for (const slug of ["maboloka", "soshanguve"]) {
      expect(getLocationDetail(slug)).toBeDefined();
    }
    // The index only renders slugs from the data source — nothing invented.
    expect(page).not.toMatch(/testimonial/i);
    expect(page).not.toMatch(/street address/i);
  });

  it("is reachable from location pages and the footer", () => {
    expect(readSource("components/mogen/location-detail.tsx")).toContain(
      'href="/locations"',
    );
    expect(readSource("components/mogen/footer.tsx")).toContain("/locations");
  });
});

describe("locations — sitemap and URLs", () => {
  it("includes the directory and preserves existing location URLs", () => {
    const urls = sitemap().map((e) => e.url);
    const base = getSiteUrl();
    expect(urls).toContain(`${base}/locations`);
    expect(urls).toContain(`${base}/locations/maboloka`);
    expect(urls).toContain(`${base}/locations/soshanguve`);
  });

  it("keeps location detail routes wired to static params + notFound", () => {
    const route = readSource("app/locations/[slug]/page.tsx");
    expect(route).toContain("generateStaticParams");
    expect(route).toContain("notFound()");
  });

  it("lists only entries backed by the data source", () => {
    // Every /locations/* sitemap entry resolves through getLocationDetail.
    const base = getSiteUrl();
    const locationUrls = sitemap()
      .map((e) => e.url)
      .filter((url) => url.startsWith(`${base}/locations/`));
    expect(locationUrls.length).toBeGreaterThan(0);
    for (const url of locationUrls) {
      const slug = url.slice(`${base}/locations/`.length);
      expect(getLocationDetail(slug)).toBeDefined();
    }
    expect(LOCATIONS.length).toBeGreaterThan(0);
  });
});
