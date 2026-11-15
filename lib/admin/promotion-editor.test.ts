import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

function readSource(relativePath: string): string {
  return readFileSync(join(process.cwd(), relativePath), "utf8");
}

describe("promotion editor wizard", () => {
  it("starts newly created promotions in guided create mode", () => {
    const actions = readSource("lib/admin/catalogue-actions.ts");
    const page = readSource("app/(admin)/admin/promotions/[id]/page.tsx");

    expect(actions).toContain("?created=1");
    expect(page).toContain('mode={created === "1" ? "create" : "edit"}');
  });

  it("guards tab navigation with dirty and create-progress checks", () => {
    const wizard = readSource("components/mogen/promotion-editor-wizard.tsx");

    expect(wizard).toContain("Save or reset your changes before leaving this step.");
    expect(wizard).toContain("Complete this step and choose Next before opening a later step.");
    expect(wizard).toContain("Save & next");
    expect(wizard).toContain("Reset changes");
    expect(wizard).toContain("window.confirm");
  });

  it("persists and validates each step independently", () => {
    const actions = readSource("lib/admin/catalogue-actions.ts");

    for (const step of ["details", "pricing", "terms", "publication"]) {
      expect(actions).toContain(`step === "${step}"`);
    }
    expect(actions).toContain("projectPromotion(");
    expect(actions).toContain("return { status: \"error\", step, message: actionError(error) }");
  });

  it("supports package-level multi-plan and setup-fee discounts in human units", () => {
    const wizard = readSource("components/mogen/promotion-editor-wizard.tsx");
    const actions = readSource("lib/admin/catalogue-actions.ts");

    expect(wizard).toContain('name="targets"');
    expect(wizard).toContain("No setup fee to discount");
    expect(wizard).toContain('label: "Fixed amount (rand)"');
    expect(actions).toContain("Math.round(humanDiscount * 100)");
    expect(actions).toContain("db.insert(webPromotionPrices).values(targets)");
    expect(actions).toContain("has no ${input.appliesTo === \"setup\" ? \"setup fee\" : \"price\"} to discount");
  });
});
