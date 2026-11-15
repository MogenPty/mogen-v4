import { readFileSync } from "node:fs";
import { join } from "node:path";
import { expect, test, vi } from "vitest";

vi.mock("server-only", () => ({}));

test("renders database promotion slugs at request time", async () => {
  const route = await import("@/app/(public)/promotions/[slug]/page");

  expect(route.dynamic).toBe("force-dynamic");
  expect("generateStaticParams" in route).toBe(false);
}, 15_000);

test("groups database discount lines by payment option", () => {
  const source = readFileSync(join(process.cwd(), "app/(public)/promotions/[slug]/page.tsx"), "utf8");

  expect(source).toContain("line.priceOptionId ?? line.label");
  expect(source).toContain("group.lines.length > 1");
});

test("renders setup discounts beneath their main payment option on collection cards", () => {
  const source = readFileSync(join(process.cwd(), "components/mogen/promotion-card.tsx"), "utf8");

  expect(source).toContain("line.priceOptionId");
  expect(source).toContain('line.appliesTo !== "setup"');
  expect(source).toContain("setupLines.map");
  expect(source).toContain('index > 0 && "border-t border-ink/15 pt-3');
});

test("carries promotional amounts into the contact payment summary", () => {
  const pageSource = readFileSync(join(process.cwd(), "app/(public)/contact/page.tsx"), "utf8");
  const formSource = readFileSync(join(process.cwd(), "components/mogen/contact-form.tsx"), "utf8");

  expect(pageSource).toContain("pricing: promotion.pricing");
  expect(formSource).toContain("selectedPromotionPrice");
  expect(formSource).toContain("selectedPromotionSetup");
  expect(formSource).toContain("const findPromotionForOption");
  expect(formSource).toContain("promotion.slug === form.promotion");
  expect(formSource).toContain("findPromotionForOption(value, next.form.package)");
  expect(formSource).toContain("findPromotionForOption(option.id)");
  expect(formSource).toContain("Promotion price:");
  expect(formSource).toContain("Promotional setup:");
  expect(formSource).toContain("promotion (normally");
  expect(formSource).toContain("promotion: selectedPromotion?.slug ?? form.promotion");
});
