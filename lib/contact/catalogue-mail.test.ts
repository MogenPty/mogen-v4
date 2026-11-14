import { describe, expect, it } from "vitest";
import {
  buildContactHtml,
  buildContactText,
  contactInputSchema,
  resolveSubmissionPackage,
} from "./contact-service";

const input = contactInputSchema.parse({
  name: "Sample Customer",
  email: "customer@example.com",
  businessName: "Example Business",
  service: "Web Development",
  package: "budding",
  message: "I would like an estimate for my new website.",
});

describe("database catalogue enquiry mail", () => {
  it("keeps new package identifiers through server-side normalization", () => {
    expect(resolveSubmissionPackage(input)).toBe("budding");
  });
  it("uses the published DB package name when the server provides it", () => {
    const text = buildContactText(input, "2026-11-06T00:00:00.000Z", "Budding Business");
    const html = buildContactHtml(input, "2026-11-06T00:00:00.000Z", "Budding Business");
    expect(text).toContain("Package: Budding Business");
    expect(html).toContain("Budding Business");
  });
  it("does not inject unescaped catalogue names into HTML mail", () => {
    const html = buildContactHtml(input, "2026-11-06T00:00:00.000Z", 'Budding <Business> & "More"');
    expect(html).toContain("Budding &lt;Business&gt; &amp; &quot;More&quot;");
    expect(html).not.toContain("<Business>");
  });
  it("clears an incompatible package when switching services", () => {
    expect(resolveSubmissionPackage({ service: "SEO", package: "budding" })).toBe("");
  });
  it("includes a server-approved billing label in both email renderers", () => {
    const plain = buildContactText(input, "2026-11-06T00:00:00.000Z", "Budding", "Managed Monthly");
    const html = buildContactHtml(input, "2026-11-06T00:00:00.000Z", "Budding", "Managed Monthly");
    expect(plain).toContain("Payment option: Managed Monthly");
    expect(html).toContain("Payment option");
    expect(html).toContain("Managed Monthly");
  });
  it("escapes approved option label in HTML", () => {
    const html = buildContactHtml(input, "2026-11-06T00:00:00.000Z", "Budding", "<Once-Off> & More");
    expect(html).toContain("&lt;Once-Off&gt; &amp; More");
    expect(html).not.toContain("<Once-Off>");
  });

  it("includes only a server-approved promotion name in both email formats", () => {
    const promoted = contactInputSchema.parse({ ...input, promotion: "sprout-launch" });
    const plain = buildContactText(promoted, "2026-11-11T12:00:00.000Z", "Sprout", "Managed Monthly", "Sprout Launch");
    const html = buildContactHtml(promoted, "2026-11-11T12:00:00.000Z", "Sprout", "Managed Monthly", "Sprout Launch");
    expect(plain).toContain("Promotion: Sprout Launch");
    expect(html).toContain("Promotion");
    expect(html).toContain("Sprout Launch");
    const withoutApproval = buildContactText(promoted, "2026-11-11T12:00:00.000Z", "Sprout", "Managed Monthly");
    expect(withoutApproval).not.toContain("Promotion:");
  });

});
