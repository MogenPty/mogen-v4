import { expect, test, vi } from "vitest";

vi.mock("server-only", () => ({}));

test("renders database promotion slugs at request time", async () => {
  const route = await import("@/app/(public)/promotions/[slug]/page");

  expect(route.dynamic).toBe("force-dynamic");
  expect("generateStaticParams" in route).toBe(false);
});
