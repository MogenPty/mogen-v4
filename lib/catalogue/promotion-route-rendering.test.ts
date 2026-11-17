import { readFileSync } from "node:fs";
import { join } from "node:path";
import { expect, test, vi } from "vitest";
import { formatPromotionInstant } from "@/lib/catalogue/promotion-display";
import {
  resolvePromotionForOption,
  type ContactPromotionChoice,
} from "@/lib/contact/promotion-selection";

vi.mock("server-only", () => ({}));

test("renders database promotion slugs at request time", async () => {
  const route = await import("@/app/(public)/promotions/[slug]/page");

  expect(route.dynamic).toBe("force-dynamic");
  expect("generateStaticParams" in route).toBe(false);
}, 30_000);

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
  expect(formSource).toContain("Promotion price:");
  expect(formSource).toContain("Promotional setup:");
  expect(formSource).toContain("promotion (normally");
  expect(formSource).toContain("promotion: selectedPromotion?.slug ?? form.promotion");
});

test("keeps an explicitly selected campaign across pricing and submission", () => {
  const campaigns: ContactPromotionChoice[] = [
    {
      slug: "campaign-a",
      name: "Campaign A",
      relatedPackage: "seedling",
      targetPriceOptionIds: ["seedling-monthly"],
      pricing: [{ label: "Monthly subscription", regular: "R 449", promotional: "R 420", priceOptionId: "seedling-monthly", appliesTo: "recurring" }],
    },
    {
      slug: "campaign-b",
      name: "Campaign B",
      relatedPackage: "seedling",
      targetPriceOptionIds: ["seedling-monthly"],
      pricing: [{ label: "Monthly subscription", regular: "R 449", promotional: "R 400", priceOptionId: "seedling-monthly", appliesTo: "recurring" }],
    },
  ];

  const selected = resolvePromotionForOption(campaigns, "campaign-b", "seedling", "seedling-monthly");
  const selectedPrice = selected?.pricing.find(line => line.priceOptionId === "seedling-monthly");

  expect(selected?.slug).toBe("campaign-b");
  expect(selectedPrice?.promotional).toBe("R 400");
  expect(selected?.slug ?? "").toBe("campaign-b");
  expect(resolvePromotionForOption(campaigns, "campaign-b", "seedling", "seedling-self-hosted")?.slug ?? "").toBe("");
});

test("formats database promotion instants in Johannesburg time", () => {
  expect(formatPromotionInstant("2026-11-11T22:00:00.000Z"))
    .toBe("12 November 2026, 00:00 SAST (UTC+02:00)");
});
