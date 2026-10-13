import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import sitemap from "@/app/sitemap";
import {
  getLocationDetail,
  LOCATIONS,
  LOCATION_SLUGS,
} from "@/data/locations";
import { getSiteUrl } from "@/data/site";

function readSource(relativePath: string): string {
  return readFileSync(join(process.cwd(), relativePath), "utf8");
}

describe("centurion — data source", () => {
  it("exists as a served-area detail (remote delivery, no office invented)", () => {
    const centurion = getLocationDetail("centurion");
    expect(centurion).toBeDefined();
    expect(centurion?.name).toBe("Centurion");
    expect(centurion?.presence).toBe("served");
    expect(centurion?.role.toLowerCase()).toContain("served");
    expect(centurion?.addressLocality).toBe("Centurion");
    expect(centurion?.addressRegion).toBe("Gauteng");
    // Remote delivery is explicit; no office, address or visits claimed.
    expect(centurion?.intro.toLowerCase()).toContain("remotely");
    expect(centurion?.intro.toLowerCase()).toContain("no mogen office");
    expect(centurion?.metaDescription).toContain("No Centurion office");
    expect(centurion?.servicesNote?.toLowerCase()).toContain("remote");
  });

  it("lists Centurion in the directory data with a real detail href", () => {
    const entry = LOCATIONS.find((l) => l.slug === "centurion");
    expect(entry).toBeDefined();
    expect(entry?.href).toBe("/locations/centurion");
    expect(entry?.region).toBe("Gauteng");
    expect(LOCATION_SLUGS).toContain("centurion");
  });

  it("invents no office, testimonials, projects, statistics or opening date", () => {
    const combined = JSON.stringify(getLocationDetail("centurion"));
    expect(combined).not.toMatch(/testimonial/i);
    expect(combined).not.toMatch(/street address/i);
    expect(combined).not.toMatch(/opening date/i);
    expect(combined).not.toMatch(/founded/i);
    expect(combined).not.toContain("%");
    // No street, geo, hours or ratings — city/region only.
    expect(combined).not.toMatch(/latitude/i);
    expect(combined).not.toMatch(/longitude/i);
    expect(combined).not.toMatch(/openingHours/i);
    expect(combined).not.toMatch(/aggregateRating/i);
  });

  it("links Centurion to the existing service and contact routes", () => {
    const centurion = getLocationDetail("centurion")!;
    const hrefs = centurion.services.map((s) => s.href).sort();
    expect(hrefs).toEqual([
      "/services/business-documentation",
      "/services/digital-marketing",
      "/services/seo",
      "/services/web-development",
    ]);
  });
});

describe("centurion — route and metadata", () => {
  it("has non-empty metadata built through the shared helper", () => {
    const centurion = getLocationDetail("centurion")!;
    expect(centurion.metaTitle.length).toBeGreaterThan(0);
    expect(centurion.metaDescription.length).toBeGreaterThan(10);
    const route = readSource("app/locations/[slug]/page.tsx");
    expect(route).toContain("pageMetadata");
    expect(route).toContain("generateStaticParams");
    expect(route).toContain("notFound()");
  });

  it("is reachable from the directory, footer and sitemap", () => {
    expect(readSource("components/mogen/footer.tsx")).toContain(
      "/locations/centurion",
    );
    // The index renders every LOCATION_SLUGS entry — Centurion included.
    expect(readSource("app/locations/page.tsx")).toContain("LOCATION_SLUGS");
    const urls = sitemap().map((e) => e.url);
    const base = getSiteUrl();
    expect(urls).toContain(`${base}/locations/centurion`);
    // Every sitemap /locations/* entry resolves through the data source.
    for (const url of urls.filter((u) =>
      u.startsWith(`${base}/locations/`),
    )) {
      expect(
        getLocationDetail(url.slice(`${base}/locations/`.length)),
      ).toBeDefined();
    }
  });

  it("renders served-area visiting copy (never a Centurion office visit)", () => {
    const detail = readSource("components/mogen/location-detail.tsx");
    expect(detail).toContain("presence");
    expect(detail).toContain("remotely");
    expect(detail).toContain("no office");
  });
});
