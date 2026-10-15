import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import sitemap from "@/app/sitemap";
import {
  getLocationDetail,
  LOCATIONS,
  LOCATION_SLUGS,
} from "@/data/locations";
import { getSiteUrl, siteConfig } from "@/data/site";

function readSource(relativePath: string): string {
  return readFileSync(join(process.cwd(), relativePath), "utf8");
}

describe("offices — three physical offices", () => {
  it("lists Maboloka, Soshanguve and Centurion as offices", () => {
    expect(LOCATION_SLUGS).toEqual(
      expect.arrayContaining(["maboloka", "soshanguve", "centurion"]),
    );
    for (const slug of ["maboloka", "soshanguve", "centurion"]) {
      expect(getLocationDetail(slug)?.presence).toBe("physical");
    }
    expect(getLocationDetail("maboloka")?.role).toBe("Head Office");
    expect(getLocationDetail("soshanguve")?.role).toBe("Office");
    expect(getLocationDetail("centurion")?.role).toBe("Office");
    // Soshanguve is reinstated — no satellite wording remains.
    expect(JSON.stringify(LOCATIONS)).not.toMatch(/satellite/i);
    expect(
      Object.values(getLocationDetail("soshanguve") ?? {}).join(" "),
    ).not.toMatch(/satellite/i);
  });

  it("uses owner-provided areas only — no street names or numbers", () => {
    expect(getLocationDetail("maboloka")?.area).toBe("Tambo, Maboloka");
    expect(getLocationDetail("soshanguve")?.area).toBe("Block-Y, Soshanguve");
    expect(getLocationDetail("centurion")?.area).toBe("Monavoni, Centurion");
    for (const slug of LOCATION_SLUGS) {
      const area = getLocationDetail(slug)!.area;
      expect(area).not.toMatch(/\d/);
      expect(area).not.toMatch(/street|road|avenue|drive/i);
    }
  });

  it("gives every office its own email address", () => {
    expect(getLocationDetail("maboloka")?.email).toBe(
      "maboloka@mogen.co.za",
    );
    expect(getLocationDetail("soshanguve")?.email).toBe(
      "soshanguve@mogen.co.za",
    );
    expect(getLocationDetail("centurion")?.email).toBe(
      "centurion@mogen.co.za",
    );
    // Location pages render the office email (mailto), not the generic one.
    const detail = readSource("components/mogen/location-detail.tsx");
    expect(detail).toContain("location.email");
    expect(detail).toContain("mailto:${location.email}");
  });

  it("keeps the office WhatsApp-linked phone number on location pages", () => {
    // 071-863-1884 in national format matches the configured number.
    expect(siteConfig.telephone.replace(/\D/g, "")).toContain("718631884");
    const detail = readSource("components/mogen/location-detail.tsx");
    expect(detail).toContain("siteConfig.telephone");
    expect(detail).toContain("WhatsApp Business");
  });
});

describe("offices — Centurion", () => {
  it("presents Centurion as an office serving Centurion and surrounds", () => {
    const centurion = getLocationDetail("centurion")!;
    expect(centurion.intro).toContain("Monavoni");
    expect(centurion.intro.toLowerCase()).toContain("surrounding areas");
    expect(centurion.metaDescription).toContain("Monavoni");
    expect(centurion.addressLocality).toBe("Centurion");
    expect(centurion.addressRegion).toBe("Gauteng");
  });

  it("keeps office copy evergreen — no time-bound wording", () => {
    // Location pages must read the same in a year: no openings, dates,
    // launches or growth claims that would force a revisit. Only
    // articles and promotions change regularly.
    const combined = LOCATION_SLUGS.map(
      (slug) => JSON.stringify(getLocationDetail(slug)),
    ).join(" ");
    expect(combined).not.toMatch(/opening|weekend|launch|growing/i);
    expect(combined).not.toMatch(/new office|just opened|recently/i);
  });

  it("covers all four services with the Centurion team", () => {
    const centurion = getLocationDetail("centurion")!;
    expect(centurion.activities).toHaveLength(4);
    expect(centurion.services.map((s) => s.href).sort()).toEqual([
      "/services/business-documentation",
      "/services/digital-marketing",
      "/services/seo",
      "/services/web-development",
    ]);
    expect(centurion.servicesNote?.toLowerCase()).toContain("centurion team");
  });

  it("invents no testimonials, ratings, statistics or street details", () => {
    const combined = JSON.stringify(getLocationDetail("centurion"));
    expect(combined).not.toMatch(/testimonial/i);
    expect(combined).not.toMatch(/aggregateRating/i);
    expect(combined).not.toContain("%");
    expect(combined).not.toMatch(/latitude|longitude|openingHours/i);
  });
});

describe("offices — Soshanguve reinstated as a full-service office", () => {
  it("delivers all four services from the Soshanguve team", () => {
    const soshanguve = getLocationDetail("soshanguve")!;
    expect(soshanguve.activities).toHaveLength(4);
    expect(soshanguve.services.map((s) => s.href).sort()).toEqual([
      "/services/business-documentation",
      "/services/digital-marketing",
      "/services/seo",
      "/services/web-development",
    ]);
    expect(soshanguve.servicesNote?.toLowerCase()).toContain(
      "soshanguve team",
    );
    expect(soshanguve.metaDescription.toLowerCase()).toContain("block-y");
  });
});

describe("offices — discovery", () => {
  it("keeps every office in the sitemap, footer and directory", () => {
    const urls = sitemap().map((e) => e.url);
    const base = getSiteUrl();
    for (const slug of ["maboloka", "soshanguve", "centurion"]) {
      expect(urls).toContain(`${base}/locations/${slug}`);
      expect(readSource("components/mogen/footer.tsx")).toContain(
        `/locations/${slug}`,
      );
    }
    expect(readSource("app/locations/page.tsx")).toContain("LOCATION_SLUGS");
  });

  it("links all three offices from the contact page", () => {
    const contact = readSource("components/mogen/contact.tsx");
    for (const slug of ["maboloka", "soshanguve", "centurion"]) {
      expect(contact).toContain(`/locations/${slug}`);
    }
    expect(contact).not.toMatch(/satellite/i);
  });
});
