import { beforeEach, describe, expect, it, vi } from "vitest";

const { limit, batch } = vi.hoisted(() => ({ limit: vi.fn(), batch: vi.fn() }));

vi.mock("server-only", () => ({}));
vi.mock("@/lib/admin/access", () => ({ requireCatalogueAdmin: async () => "admin" }));
vi.mock("@/db/client", () => ({
  getCatalogueDb: () => ({
    select: () => ({ from: () => ({ where: () => ({ limit }) }) }),
    batch,
  }),
}));
vi.mock("@/lib/catalogue/promotions-server", () => ({ loadPublicPromotions: vi.fn() }));
vi.mock("@/lib/articles/loader", () => ({ getAllArticles: vi.fn() }));

import { createGoneRuleAction, createRedirectAction } from "@/lib/admin/redirect-actions";

function ruleForm() {
  const data = new FormData();
  data.set("sourcePath", "/old-page/");
  data.set("destinationPath", "/contact");
  data.set("statusCode", "308");
  return data;
}

describe("redirect admin source conflicts", () => {
  beforeEach(() => {
    limit.mockReset();
    batch.mockReset();
  });

  it("returns the existing redirect to the form instead of throwing", async () => {
    limit.mockResolvedValueOnce([{ id: "existing-rule" }]).mockResolvedValueOnce([]);
    await expect(createRedirectAction(null, ruleForm())).resolves.toEqual({
      sourcePath: "/old-page",
      owner: { kind: "redirect", id: "existing-rule" },
    });
    expect(batch).not.toHaveBeenCalled();
  });

  it("returns a 410 owner to the form and leaves it in place", async () => {
    limit.mockResolvedValueOnce([]).mockResolvedValueOnce([{ id: "gone-rule" }]);
    await expect(createGoneRuleAction(null, ruleForm())).resolves.toEqual({
      sourcePath: "/old-page",
      owner: { kind: "gone" },
    });
    expect(batch).not.toHaveBeenCalled();
  });
});
