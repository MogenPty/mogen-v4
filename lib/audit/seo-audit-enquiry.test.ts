import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { getPackage } from "@/data/packages";
import { getService } from "@/data/services";

function readSource(relativePath: string): string {
  return readFileSync(join(process.cwd(), relativePath), "utf8");
}

describe("seo audit enquiry — package source of truth", () => {
  it("SEO service defines exactly Ignition, Scale, Dominance packages", () => {
    const seo = getService("seo");
    expect(seo).toBeDefined();
    const pricing = seo?.pricing ?? [];
    expect(pricing.map((p) => p.packageId)).toEqual([
      "ignition",
      "scale",
      "dominance",
    ]);
    expect(pricing.map((p) => p.name)).toEqual([
      "Ignition",
      "Scale",
      "Dominance",
    ]);
    // Each package carries displayable offer data (no invented copy needed).
    for (const p of pricing) {
      expect(p.price.trim()).not.toBe("");
      expect(p.features.length).toBeGreaterThan(0);
    }
  });

  it("package registry maps ignition/scale/dominance to the seo service", () => {
    for (const id of ["ignition", "scale", "dominance"]) {
      const pkg = getPackage(id);
      expect(pkg).toBeDefined();
      expect(pkg?.serviceSlug).toBe("seo");
    }
  });
});

describe("seo audit enquiry — growth-audit form is the package selector", () => {
  const source = readSource("components/mogen/growth-audit.tsx");

  it("opens blank with an empty-value placeholder (invalid/unselected state)", () => {
    expect(source).toContain('service_interest: ""');
    expect(source).toContain("Select an SEO package");
    expect(source).toMatch(/<option value=""[^>]*>\s*Select an SEO package/);
  });

  it("renders dropdown options readable on the dark panel (explicit option background)", () => {
    expect(source).toMatch(/<option[^>]*className="[^"]*bg-ink[^"]*"[^>]*>\s*Select an SEO package/);
    expect(source).toContain("scheme-dark");
  });

  it("derives options from the canonical SEO package data (no second hardcoded list)", () => {
    expect(source).toContain('getService("seo")');
    expect(source).not.toContain("Web Development");
    expect(source).not.toContain("Business Documentation");
    // Labels are rendered from package data, not hardcoded strings.
    expect(source).toContain("SEO - {p.name}");
    expect(source).toContain("p.packageId");
  });

  it("blocks submission while blank with a clear validation message", () => {
    expect(source).toContain("if (!form.service_interest)");
    expect(source).toContain("Please select an SEO package.");
  });

  it("keeps one source of truth driving both the select and the offer display", () => {
    expect(source).toContain("selectedSeoPackage");
    expect(source).toContain(
      "seoPackages.find((p) => p.packageId === form.service_interest)",
    );
    expect(source).toContain("seo-package-offer");
  });

  it("renders the selected package offer from existing package fields only", () => {
    expect(source).toContain("selectedSeoPackage.name");
    expect(source).toContain("selectedSeoPackage.price");
    expect(source).toContain("selectedSeoPackage.features");
    // Blank state shows help text, not an auto-selected package.
    expect(source).toContain("Select an SEO package to continue.");
  });

  it("preserves the analysed website in the enquiry context", () => {
    expect(source).toContain("audit.site.finalUrl");
    expect(source).toContain('service: form.service_interest');
  });
});

describe("seo audit enquiry — package switching", () => {
  it.each([
    ["ignition", "Ignition"],
    ["scale", "Scale"],
    ["dominance", "Dominance"],
  ])("package id %s resolves to display name %s", (id, name) => {
    const pkg = getPackage(id);
    expect(pkg?.name).toBe(name);
    expect(`SEO - ${pkg?.name}`).toBe(`SEO - ${name}`);
  });

  it("Ignition offer exposes the Core 17 of 37 steps benefit from package data", () => {
    const ignition = (getService("seo")?.pricing ?? []).find(
      (p) => p.packageId === "ignition",
    );
    expect(ignition?.features ?? []).toContain("Core 17 of 37 steps");
  });
});

describe("normal enquiry regression — contact form untouched", () => {
  const contactSource = readFileSync(
    join(process.cwd(), "components/mogen/contact-form.tsx"),
    "utf8",
  );

  it("still offers the four general services (not the SEO package selector)", () => {
    expect(contactSource).toContain("CONTACT_SERVICES");
    expect(contactSource).toContain("Select a service");
    expect(contactSource).not.toContain("Select an SEO package");
    expect(contactSource).not.toContain("selectedSeoPackage");
  });

  it("contact service list still covers the general enquiry services", async () => {
    const { CONTACT_SERVICES } = await import(
      "@/lib/contact/contact-service"
    );
    expect(CONTACT_SERVICES).toContain("Web Development");
    expect(CONTACT_SERVICES).toContain("SEO");
    expect(CONTACT_SERVICES).toContain("Digital Marketing");
    expect(CONTACT_SERVICES).toContain("Business Documentation");
  });
});
