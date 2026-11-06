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
});
