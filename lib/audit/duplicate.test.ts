import { describe, expect, it } from "vitest";
import { detectDuplicates, jaccardSimilarity, normalizeText } from "./duplicate";

const PAGE_A =
  "Mogen builds fast websites for South African businesses with search optimisation included and ongoing maintenance and support every single month of the year without interruption plus monthly reporting and strategy reviews for continuous improvement.";
const PAGE_B =
  "Completely different copy about mountain hiking trails and weather conditions in the Drakensberg region today with packing lists safety guidance maps transport options and accommodation advice for all visitors.";

describe("duplicate detection", () => {
  it("flags exact duplicates", () => {
    const report = detectDuplicates([
      { url: "https://example.com/about", visibleText: PAGE_A },
      { url: "https://example.com/services", visibleText: `  ${PAGE_A.toUpperCase()}  ` },
    ]);
    expect(report.exactCount).toBe(1);
    expect(report.pairs[0].similarity).toBe(1);
  });

  it("clears genuinely different pages", () => {
    const report = detectDuplicates([
      { url: "https://example.com/a", visibleText: PAGE_A },
      { url: "https://example.com/b", visibleText: PAGE_B },
    ]);
    expect(report.pairs).toHaveLength(0);
  });

  it("detects near duplicates by similarity", () => {
    const variant = `${PAGE_A} Contact our team today for a free quote and friendly advice on weekends.`;
    const similarity = jaccardSimilarity(normalizeText(PAGE_A), normalizeText(variant));
    expect(similarity).toBeGreaterThan(0.5);
    expect(similarity).toBeLessThan(1);
    const report = detectDuplicates(
      [
        { url: "https://example.com/a", visibleText: PAGE_A },
        { url: "https://example.com/b", visibleText: variant },
      ],
      0.3,
    );
    expect(report.nearCount).toBe(1);
    expect(report.exactCount).toBe(0);
  });
});
