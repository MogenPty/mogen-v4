import { describe, expect, it } from "vitest";
import { RedirectRuleCache } from "./cache";
import {
  assertNoRedirectChains,
  buildRouteSnapshot,
  redirectLocation,
  resolveRoute,
  type RedirectSnapshotRule,
} from "./engine";

const rule = (overrides: Partial<RedirectSnapshotRule> = {}): RedirectSnapshotRule => ({
  id: "rule-1",
  sourcePath: "/old",
  destinationPath: "/new",
  matchType: "exact",
  statusCode: 308,
  preserveQuery: true,
  expiresAt: null,
  ...overrides,
});

describe("redirect engine", () => {
  it.each([301, 302, 307, 308] as const)("resolves status %s", statusCode => {
    const result = resolveRoute("/old", buildRouteSnapshot(1, [rule({ statusCode })], []));
    expect(result).toMatchObject({ kind: "redirect", statusCode, destinationPath: "/new" });
  });

  it("preserves query strings only when configured", () => {
    const requestUrl = new URL("https://www.mogen.co.za/old?utm_source=test&page=2");
    const preserved = resolveRoute("/old", buildRouteSnapshot(1, [rule()], []));
    expect(preserved.kind).toBe("redirect");
    if (preserved.kind === "redirect") expect(redirectLocation(requestUrl, preserved).href).toBe("https://www.mogen.co.za/new?utm_source=test&page=2");

    const dropped = resolveRoute("/old", buildRouteSnapshot(1, [rule({ preserveQuery: false })], []));
    expect(dropped.kind).toBe("redirect");
    if (dropped.kind === "redirect") expect(redirectLocation(requestUrl, dropped).href).toBe("https://www.mogen.co.za/new");
  });

  it("prefers exact, then segment, then longest catch-all", () => {
    const snapshot = buildRouteSnapshot(1, [
      rule({ id: "splat-short", sourcePath: "/old/:path*", destinationPath: "/short/:path*", matchType: "splat" }),
      rule({ id: "splat-long", sourcePath: "/old/deep/:path*", destinationPath: "/deep/:path*", matchType: "splat" }),
      rule({ id: "segment", sourcePath: "/old/:segment", destinationPath: "/single/:segment", matchType: "segment" }),
      rule({ id: "exact", sourcePath: "/old/fixed", destinationPath: "/fixed", matchType: "exact" }),
    ], []);
    expect(resolveRoute("/old/fixed", snapshot)).toMatchObject({ ruleId: "exact" });
    expect(resolveRoute("/old/one", snapshot)).toMatchObject({ ruleId: "segment" });
    expect(resolveRoute("/old/deep/a/b", snapshot)).toMatchObject({ ruleId: "splat-long" });
  });

  it("returns 410 rules and ignores expired redirects", () => {
    const snapshot = buildRouteSnapshot(1, [rule({ expiresAt: new Date("2026-01-01") })], [{
      id: "gone-1", sourcePath: "/gone", matchType: "exact", expiresAt: null,
    }]);
    expect(resolveRoute("/old", snapshot, new Date("2026-02-01"))).toEqual({ kind: "none" });
    expect(resolveRoute("/gone", snapshot)).toEqual({ kind: "gone", ruleId: "gone-1" });
  });

  it("rejects loops, chains and cross-type conflicts", () => {
    expect(() => assertNoRedirectChains([rule({ destinationPath: "/old" })])).toThrow(/loop/i);
    expect(() => assertNoRedirectChains([
      rule(),
      rule({ id: "rule-2", sourcePath: "/new", destinationPath: "/final" }),
    ])).toThrow(/chain/i);
    expect(() => buildRouteSnapshot(1, [rule()], [{
      id: "gone-1", sourcePath: "/old", matchType: "exact", expiresAt: null,
    }])).toThrow(/conflicting/i);
  });
});

describe("redirect cache", () => {
  it("reloads on generation change and retains the last snapshot on failure", async () => {
    let generation = 1;
    let fail = false;
    let loads = 0;
    const cache = new RedirectRuleCache({
      generation: async () => {
        if (fail) throw new Error("database unavailable");
        return generation;
      },
      snapshot: async currentGeneration => {
        loads += 1;
        return buildRouteSnapshot(currentGeneration, [rule({ destinationPath: `/new-${currentGeneration}` })], []);
      },
    }, 10);

    expect((await cache.get(0))?.generation).toBe(1);
    expect((await cache.get(5))?.generation).toBe(1);
    expect(loads).toBe(1);
    generation = 2;
    expect((await cache.get(20))?.generation).toBe(2);
    fail = true;
    expect((await cache.get(40))?.generation).toBe(2);
  });
});
