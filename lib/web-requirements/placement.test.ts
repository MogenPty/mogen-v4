import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

/**
 * Phase 3 placement guard: the GrowthAudit experience lives on the SEO
 * service page (rendered immediately after Add-Ons) and no longer on the
 * homepage, which hosts the website-requirements questionnaire instead.
 *
 * Source-level assertions are deliberate: the repo's vitest project runs
 * in a node environment without component rendering, so placement is
 * verified at the composition site plus behaviour-level coverage of the
 * relocation logic (audit anchor + conversion destinations).
 */
function read(rel: string): string {
  return readFileSync(join(process.cwd(), rel), "utf8");
}

describe("GrowthAudit relocation", () => {
  it("renders GrowthAudit on the SEO service page after Add-Ons", () => {
    const source = read("components/mogen/service-detail.tsx");
    expect(source).toMatch(/import GrowthAudit/);
    const addonsAt = source.indexOf("Add-ons");
    const auditAt = source.indexOf("<GrowthAudit");
    expect(addonsAt).toBeGreaterThan(-1);
    expect(auditAt).toBeGreaterThan(addonsAt);
    // Scoped to the SEO service — other services keep their own journeys.
    expect(source).toMatch(/serviceSlug === "seo"/);
  });

  it("removes the homepage GrowthAudit instance", () => {
    const home = read("app/page.tsx");
    expect(home).not.toMatch(/GrowthAudit/);
    expect(home).not.toMatch(/id=.audit.|href="#audit"/);
  });

  it("embeds the website questionnaire on the homepage instead", () => {
    const home = read("app/page.tsx");
    expect(home).toMatch(/WebsiteQuestionnaire/);
  });

  it("keeps a single primary GrowthAudit placement", () => {
    const detail = read("components/mogen/service-detail.tsx");
    const home = read("app/page.tsx");
    expect(detail.match(/<GrowthAudit/g)?.length ?? 0).toBe(1);
    expect(home.match(/<GrowthAudit/g)?.length ?? 0).toBe(0);
  });
});
