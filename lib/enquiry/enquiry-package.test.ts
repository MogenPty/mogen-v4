import { describe, expect, it } from "vitest";
import { getPromotionBySlug } from "@/data/promotions";
import { getService, SERVICES } from "@/data/services";
import { getPackage, PACKAGES } from "@/data/packages";
import { FakeMailProvider } from "@/lib/mail/fake-mail-provider";
import {
  buildContactMessage,
  resolveSubmissionPackage,
  submitContact,
} from "@/lib/contact/contact-service";
import {
  buildEnquiryHref,
  parseEnquiryContext,
  resolveEnquiryDetails,
  resolveEnquiryPackage,
} from "./enquiry";

const config = { from: "Mogen <info@mogen.co.za>", to: "info@mogen.co.za" };

function resolve(query: string) {
  return resolveEnquiryDetails(
    parseEnquiryContext(new URLSearchParams(query)),
  );
}

describe("package resolves its service (promotion → package → service)", () => {
  it.each([
    ["seed", "Web Development"],
    ["sprout", "Web Development"],
    ["vegetative", "Web Development"],
    ["ignition", "SEO"],
    ["scale", "SEO"],
    ["dominance", "SEO"],
    ["starter", "Digital Marketing"],
    ["growth", "Digital Marketing"],
    ["dominate", "Digital Marketing"],
    ["essential", "Business Documentation"],
    ["standard", "Business Documentation"],
    ["complete", "Business Documentation"],
  ])("package=%s resolves service %s", (id, serviceName) => {
    const details = resolve(`package=${id}`);
    expect(details.package?.id).toBe(id);
    expect(details.packageName).toBe(resolveEnquiryPackage(id)?.name);
    expect(details.serviceName).toBe(serviceName);
    expect(details.promotion).toBeUndefined();
    expect(details.serviceAdjusted).toBe(false);
    expect(details.packageAdjusted).toBe(false);
  });

  it("registers exactly the 12 current packages, each with one service", () => {
    expect(PACKAGES.map((p) => p.id)).toEqual([
      "seed",
      "sprout",
      "vegetative",
      "ignition",
      "scale",
      "dominance",
      "starter",
      "growth",
      "dominate",
      "essential",
      "standard",
      "complete",
    ]);
    const serviceSlugs = new Set(SERVICES.map((s) => s.slug));
    for (const pkg of PACKAGES) {
      expect(serviceSlugs.has(pkg.serviceSlug)).toBe(true);
    }
  });

  it("returns undefined for unknown, empty or missing package ids", () => {
    expect(resolveEnquiryPackage("bogus")).toBeUndefined();
    expect(resolveEnquiryPackage("")).toBeUndefined();
    expect(resolveEnquiryPackage(undefined)).toBeUndefined();
  });

  it("ignores an unknown package but keeps a valid service", () => {
    const details = resolve("package=bogus&service=seo");
    expect(details.package).toBeUndefined();
    expect(details.packageName).toBeUndefined();
    expect(details.serviceName).toBe("SEO");
  });
});

describe("promotion resolves its package and service", () => {
  it("sprout promotion resolves package sprout + web-development", () => {
    const details = resolve("promotion=mogen-sprout-first-100");
    expect(details.promotion?.slug).toBe("mogen-sprout-first-100");
    expect(details.package?.id).toBe("sprout");
    expect(details.packageName).toBe("Sprout");
    expect(details.serviceName).toBe("Web Development");
    expect(details.message).toContain("Mogen Sprout Website");
  });

  it("seed promotion resolves package seed + web-development", () => {
    const details = resolve("promotion=mogen-seed-r99");
    expect(details.package?.id).toBe("seed");
    expect(details.serviceName).toBe("Web Development");
  });

  it("keeps an explicit matching package untouched", () => {
    const details = resolve(
      "promotion=mogen-sprout-first-100&package=sprout&service=web-development",
    );
    expect(details.package?.id).toBe("sprout");
    expect(details.serviceName).toBe("Web Development");
    expect(details.packageAdjusted).toBe(false);
    expect(details.serviceAdjusted).toBe(false);
  });
});

describe("minimal enquiry URLs", () => {
  it("builds a package-only URL", () => {
    expect(buildEnquiryHref({ package: "sprout" })).toBe(
      "/contact?package=sprout",
    );
  });

  it("builds a promotion-only URL", () => {
    expect(buildEnquiryHref({ promotion: "mogen-sprout-first-100" })).toBe(
      "/contact?promotion=mogen-sprout-first-100",
    );
  });

  it("builds a service-only URL", () => {
    expect(buildEnquiryHref({ service: "seo" })).toBe("/contact?service=seo");
  });

  it("builds a generic URL", () => {
    expect(buildEnquiryHref({})).toBe("/contact");
  });

  it("carries package through existing search params", () => {
    const href = buildEnquiryHref({
      attribution: { utm_source: "whatsapp" },
      existingSearchParams: new URLSearchParams("package=ignition"),
    });
    const params = new URLSearchParams(href.split("?")[1]);
    expect(params.get("package")).toBe("ignition");
    expect(params.get("utm_source")).toBe("whatsapp");
  });
});

describe("contradictory context normalises safely", () => {
  it("promotion wins over a contradictory package", () => {
    const details = resolve(
      "promotion=mogen-sprout-first-100&package=ignition",
    );
    expect(details.package?.id).toBe("sprout");
    expect(details.serviceName).toBe("Web Development");
    expect(details.packageAdjusted).toBe(true);
    expect(details.packageNotice).toContain("Sprout");
  });

  it("package wins over a contradictory service", () => {
    const details = resolve("package=ignition&service=web-development");
    expect(details.package?.id).toBe("ignition");
    expect(details.serviceName).toBe("SEO");
    expect(details.serviceAdjusted).toBe(true);
    expect(details.serviceNotice).toContain("SEO");
  });

  it("keeps a valid package + service combination untouched", () => {
    const details = resolve("package=sprout&service=web-development");
    expect(details.package?.id).toBe("sprout");
    expect(details.serviceName).toBe("Web Development");
    expect(details.serviceAdjusted).toBe(false);
    expect(details.packageAdjusted).toBe(false);
  });
});

describe("attribution alongside inferred context", () => {
  const campaign = {
    utm_source: "whatsapp",
    utm_medium: "organic_social",
    utm_campaign: "sprout-launch-2026",
    utm_content: "whatsapp-status",
  };

  it("promotion + attribution resolves package, service and UTMs", () => {
    const href = buildEnquiryHref({
      promotion: "mogen-sprout-first-100",
      attribution: campaign,
    });
    const details = resolve(href.split("?")[1]);
    expect(details.package?.id).toBe("sprout");
    expect(details.serviceName).toBe("Web Development");
    expect(details.attribution).toEqual(campaign);
  });

  it("package + attribution resolves the inferred service with UTMs", () => {
    const href = buildEnquiryHref({
      package: "ignition",
      attribution: campaign,
    });
    const details = resolve(href.split("?")[1]);
    expect(details.package?.id).toBe("ignition");
    expect(details.serviceName).toBe("SEO");
    expect(details.attribution).toEqual(campaign);
  });
});

describe("Other service with package context", () => {
  it("resolves service=other alone without a package", () => {
    const details = resolve("service=other");
    expect(details.serviceName).toBe("Other");
    expect(details.package).toBeUndefined();
  });

  it("lets a package CTA override a hand-crafted other service", () => {
    const details = resolve("service=other&package=sprout");
    expect(details.package?.id).toBe("sprout");
    expect(details.serviceName).toBe("Web Development");
    expect(details.serviceAdjusted).toBe(true);
  });
});

describe("package in enquiry submission", () => {
  const base = {
    name: "Test User",
    email: "visitor@example.com",
    phone: "",
    businessName: "",
    otherServiceDetail: "",
    message: "We need a new website for our business.",
    companyWebsite: "",
    attribution: {},
  };

  it("includes the resolved package in the enquiry email", async () => {
    const fake = new FakeMailProvider();
    const result = await submitContact(
      { ...base, service: "Web Development", package: "sprout" },
      fake,
      config,
      { submittedAt: "2026-01-01T00:00:00.000Z" },
    );
    expect(result).toEqual({ ok: true });
    expect(fake.sent).toHaveLength(1);
    expect(fake.sent[0].text).toContain("Package: Sprout");
    expect(fake.sent[0].html).toContain("Package");
    expect(fake.sent[0].html).toContain("Sprout");
  });

  it("omits the package row when no package was resolved", () => {
    const msg = buildContactMessage(
      { ...base, service: "SEO", package: "" },
      config,
      "2026-01-01T00:00:00.000Z",
    );
    expect(msg.text).not.toContain("Package:");
    expect(msg.html).not.toContain("Package");
  });

  it("drops unknown package identifiers", () => {
    expect(
      resolveSubmissionPackage({ service: "SEO", package: "bogus" }),
    ).toBe("");
  });

  it("drops the package when the visitor corrected the service", () => {
    expect(
      resolveSubmissionPackage({ service: "SEO", package: "sprout" }),
    ).toBe("");
    expect(
      resolveSubmissionPackage({ service: "Web Development", package: "sprout" }),
    ).toBe("sprout");
  });

  it("always drops the package for Other", () => {
    expect(
      resolveSubmissionPackage({ service: "Other", package: "sprout" }),
    ).toBe("");
  });

  it("keeps Task 01 submission behaviour for package-less enquiries", async () => {
    const fake = new FakeMailProvider();
    const result = await submitContact(
      { ...base, service: "Web Development" },
      fake,
      config,
      { submittedAt: "2026-01-01T00:00:00.000Z" },
    );
    expect(result).toEqual({ ok: true });
    expect(fake.sent[0].text).toContain("Service: Web Development");
    expect(fake.sent[0].text).not.toContain("Package:");
  });
});

describe("promotion data carries the package chain", () => {
  it("links sprout and seed promotions to their packages", () => {
    expect(
      getPromotionBySlug("mogen-sprout-first-100")?.relatedPackage,
    ).toBe("sprout");
    expect(getPromotionBySlug("mogen-seed-r99")?.relatedPackage).toBe("seed");
  });
});

describe("final package matrix display", () => {
  it("shows Web Development as Seed, Sprout, Vegetative", () => {
    expect(getService("web-development")!.pricing?.map((p) => p.name)).toEqual([
      "Seed",
      "Sprout",
      "Vegetative",
    ]);
  });

  it("shows SEO Core as 17 of 37 steps with Ignition, Scale, Dominance", () => {
    const seo = getService("seo")!;
    expect(seo.pricing?.map((p) => p.name)).toEqual([
      "Ignition",
      "Scale",
      "Dominance",
    ]);
    expect(seo.pricing?.[0].features).toContain("Core 17 of 37 steps");
    expect(seo.pricing?.[0].features).not.toContain("Core 15 of 37 steps");
  });

  it("shows Complete as a from-4-documents custom package from R4,900", () => {
    const complete = getService("business-documentation")!.pricing!.find(
      (p) => p.packageId === "complete",
    )!;
    expect(complete.name).toBe("Complete");
    expect(complete.features).toContain("Document pack (from 4 documents)");
    expect(complete.price).toBe("From R4,900");
  });

  it("shows Sprout at the normal R399/month with a R1,200 setup fee", () => {
    const sprout = getService("web-development")!.pricing!.find(
      (p) => p.packageId === "sprout",
    )!;
    expect(sprout.price).toBe("R399");
    expect(sprout.cadence).toBe("/ month");
    expect(sprout.features).toContain("R1,200 once-off setup fee");
  });

  it("shows Vegetative at R1,500/month with a R2,000 setup fee", () => {
    const vegetative = getService("web-development")!.pricing!.find(
      (p) => p.packageId === "vegetative",
    )!;
    expect(vegetative.price).toBe("R1,500");
    expect(vegetative.cadence).toBe("/ month");
    expect(vegetative.features).toContain("R2,000 once-off setup fee");
  });

  it("keeps every tier's normal pricing with its package identifier", () => {
    const prices: Record<string, string> = {
      seed: "R199",
      sprout: "R399",
      vegetative: "R1,500",
      ignition: "R8,500",
      scale: "R16,500",
      dominance: "R32,000",
      starter: "R3,500",
      growth: "R7,500",
      dominate: "R15,000",
      essential: "R1,900",
      standard: "R4,500",
      complete: "From R4,900",
    };
    for (const service of SERVICES) {
      for (const tier of service.pricing ?? []) {
        expect(tier.packageId).toBeDefined();
        expect(getPackage(tier.packageId)?.serviceSlug).toBe(service.slug);
        expect(tier.price).toBe(prices[tier.packageId]);
      }
    }
  });
});
