import { describe, expect, it } from "vitest";
import {
  DESCRIPTION_MAX,
  STATIC_META,
  TITLE_MAX,
  TITLE_SUFFIX,
  buildRouteInventory,
  finalTitle,
  validateRoutes,
  type RouteRecord,
} from "@/lib/seo/metadata-registry";

/**
 * Metadata regression tests (SEO remediation).
 *
 * Rules enforced for every indexable route (final values, template applied):
 * - FAIL: title > 60 chars, description > 160 chars.
 * - FAIL: empty title/description, duplicate final titles, malformed output.
 * - WARN (never fails): below the 50–60 / 150–160 preferred ranges,
 *   duplicate descriptions (manual review).
 *
 * Short titles are only silent with a documented named-route exception.
 * These are editorial targets, not ranking guarantees.
 */

describe("metadata registry — final titles resolve the layout template", () => {
  it("appends the brand suffix exactly once (no Mogen | Mogen)", () => {
    expect(finalTitle({ title: "Services" })).toBe("Services | Mogen");
    // No short title in the registry may already carry the suffix —
    // that is what produced the old "Mogen | Mogen" duplication.
    for (const meta of Object.values(STATIC_META)) {
      if (!meta.absoluteTitle) {
        expect(meta.title).not.toContain("| Mogen");
        expect(meta.title).not.toContain("— Mogen");
      }
    }
    // Homepage is absolute — the template must not double-suffix it.
    expect(finalTitle(STATIC_META["/"])).toBe(
      "Mogen | Web Development for South African Businesses",
    );
    expect(finalTitle(STATIC_META["/"])).not.toContain("Mogen | Mogen");
  });

  it("produces no unresolved template variables or undefined values", () => {
    for (const route of buildRouteInventory().filter((r) => r.indexable)) {
      for (const value of [route.title, route.description]) {
        expect(value).not.toContain("%s");
        expect(value).not.toContain("undefined");
        expect(value).not.toContain("{{");
      }
      expect(route.title.trim().length).toBeGreaterThan(0);
      expect(route.description.trim().length).toBeGreaterThan(0);
    }
  });
});

describe("metadata registry — indexable static routes comply", () => {
  it("has no over-limit titles or descriptions", () => {
    const routes = buildRouteInventory().filter(
      (r) => r.indexable && r.kind === "static",
    );
    expect(routes.length).toBeGreaterThan(10);
    const { errors } = validateRoutes(routes);
    expect(errors).toEqual([]);
  });
});

describe("metadata registry — dynamic routes comply (live data)", () => {
  it.each(["service", "location", "article", "promotion"] as const)(
    "has no over-limit %s metadata",
    (kind) => {
      const routes = buildRouteInventory().filter(
        (r) => r.indexable && r.kind === kind,
      );
      expect(routes.length).toBeGreaterThan(0);
      const { errors } = validateRoutes(routes);
      expect(errors).toEqual([]);
    },
  );

  it("covers every service, office, article and public promotion", () => {
    const routes = buildRouteInventory().filter((r) => r.indexable);
    const paths = new Set(routes.map((r) => r.path));
    for (const p of [
      "/services/web-development",
      "/services/seo",
      "/services/digital-marketing",
      "/services/business-documentation",
      "/locations/maboloka",
      "/locations/soshanguve",
      "/locations/centurion",
    ]) {
      expect(paths.has(p)).toBe(true);
    }
    expect(
      routes.filter((r) => r.kind === "article").length,
    ).toBeGreaterThan(10);
    expect(
      routes.filter((r) => r.kind === "promotion").length,
    ).toBeGreaterThan(0);
  });

  it("keeps indexable tag archives within limits", () => {
    const routes = buildRouteInventory().filter(
      (r) => r.kind === "tag-archive" && r.indexable,
    );
    const { errors } = validateRoutes(routes);
    expect(errors).toEqual([]);
  });
});

describe("metadata registry — whole-site compliance", () => {
  it("has no over-limit, empty, duplicate-title or malformed metadata", () => {
    const { errors } = validateRoutes(buildRouteInventory());
    expect(errors).toEqual([]);
  });

  it("excludes the intentional noindex route from compliance", () => {
    const routes = buildRouteInventory();
    const growthAudit = routes.find((r) => r.path === "/growth-audit-results");
    expect(growthAudit?.indexable).toBe(false);
    // Noindex exclusion is explicit and justified (personalised result page).
    expect(STATIC_META["/growth-audit-results"].noindex).toBe(true);
  });

  it("limits short-title exceptions to named routes with reasons", () => {
    const routes = buildRouteInventory().filter((r) => r.indexable);
    for (const r of routes.filter((r) => r.exception)) {
      expect(r.path).toBeTruthy();
      expect(r.exception!.length).toBeGreaterThan(20);
    }
    // Exceptions never excuse over-limit metadata.
    for (const r of routes.filter((r) => r.exception)) {
      expect(r.title.length).toBeLessThanOrEqual(TITLE_MAX);
      expect(r.description.length).toBeLessThanOrEqual(DESCRIPTION_MAX);
    }
  });

  it("keeps every final title unique across indexable routes", () => {
    const titles = buildRouteInventory()
      .filter((r) => r.indexable)
      .map((r) => r.title);
    expect(new Set(titles).size).toBe(titles.length);
  });
});

describe("metadata registry — validation rules prove themselves", () => {
  const oversized: RouteRecord = {
    path: "/test/oversized",
    kind: "static",
    title: `${"T".repeat(61)}${TITLE_SUFFIX}`,
    description: "D".repeat(161),
    indexable: true,
  };

  it("fails a deliberately oversized title and description", () => {
    const { errors } = validateRoutes([oversized]);
    expect(errors.some((e) => e.field === "title" && e.limit === "max")).toBe(
      true,
    );
    expect(
      errors.some((e) => e.field === "description" && e.limit === "max"),
    ).toBe(true);
    expect(errors[0].message).toContain("/test/oversized");
  });

  it("fails empty metadata and duplicate titles", () => {
    const empty: RouteRecord = {
      path: "/test/empty",
      kind: "static",
      title: "",
      description: "",
      indexable: true,
    };
    expect(
      validateRoutes([empty]).errors.some((e) => e.limit === "empty"),
    ).toBe(true);

    const dup: RouteRecord[] = [
      { path: "/a", kind: "static", title: "Same", description: "One", indexable: true },
      { path: "/b", kind: "static", title: "Same", description: "Two", indexable: true },
    ];
    expect(
      validateRoutes(dup).errors.some((e) => e.limit === "duplicate"),
    ).toBe(true);
  });

  it("warns (never fails) below the preferred range", () => {
    const short: RouteRecord = {
      path: "/test/short",
      kind: "static",
      title: "Short",
      description: "Brief.",
      indexable: true,
    };
    const result = validateRoutes([short]);
    expect(result.errors).toEqual([]);
    expect(result.warnings.length).toBeGreaterThan(0);
  });
});
