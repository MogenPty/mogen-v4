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

  it("applies specificity across redirect and gone rules", () => {
    const snapshot = buildRouteSnapshot(1, [
      rule({ id: "redirect-splat", sourcePath: "/old/:path*", destinationPath: "/new/:path*", matchType: "splat" }),
    ], [{ id: "gone-exact", sourcePath: "/old/retired", matchType: "exact", expiresAt: null }]);
    expect(resolveRoute("/old/retired", snapshot)).toEqual({ kind: "gone", ruleId: "gone-exact" });
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
    expect(() => assertNoRedirectChains([
      rule({ sourcePath: "/legacy/:path*", destinationPath: "/articles/:path*", matchType: "splat" }),
      rule({ id: "rule-2", sourcePath: "/articles/:segment", destinationPath: "/final/:segment", matchType: "segment" }),
    ])).toThrow(/chain/i);
    expect(() => buildRouteSnapshot(1, [rule()], [{
      id: "gone-1", sourcePath: "/old", matchType: "exact", expiresAt: null,
    }])).toThrow(/conflicting/i);
  });

  it("bounds an initial refresh and throttles repeated failures", async () => {
    let generationChecks = 0;
    const cache = new RedirectRuleCache({
      generation: async () => {
        generationChecks += 1;
        return await new Promise<number>(() => {});
      },
      snapshot: async () => buildRouteSnapshot(1, [], []),
    }, 1_000, 5);

    expect(await cache.get(0)).toBeNull();
    expect(await cache.get(10)).toBeNull();
    expect(generationChecks).toBe(1);
  });

  it("shares an in-flight initial load with concurrent requests", async () => {
    let release!: (value: number) => void;
    const generation = new Promise<number>(resolve => { release = resolve; });
    const cache = new RedirectRuleCache({
      generation: () => generation,
      snapshot: async currentGeneration => buildRouteSnapshot(currentGeneration, [], []),
    }, 1_000, 100);

    const first = cache.get(0);
    const second = cache.get(1);
    release(1);
    await expect(first).resolves.toMatchObject({ generation: 1 });
    await expect(second).resolves.toMatchObject({ generation: 1 });
  });

  it("does not let a timed-out refresh overwrite a newer snapshot", async () => {
    let generation = 0;
    let releaseOld!: (value: ReturnType<typeof buildRouteSnapshot>) => void;
    const oldSnapshot = new Promise<ReturnType<typeof buildRouteSnapshot>>(resolve => { releaseOld = resolve; });
    const cache = new RedirectRuleCache({
      generation: async () => generation,
      snapshot: async currentGeneration => currentGeneration === 1
        ? oldSnapshot
        : buildRouteSnapshot(currentGeneration, [], []),
    }, 10, 5);

    expect((await cache.get(0))?.generation).toBe(0);
    generation = 1;
    let timedOut: Promise<unknown> | undefined;
    expect((await cache.get(20, pending => { timedOut = pending; }))?.generation).toBe(0);
    await timedOut;
    generation = 2;
    let refreshed: Promise<unknown> | undefined;
    expect((await cache.get(40, pending => { refreshed = pending; }))?.generation).toBe(0);
    await refreshed;
    expect(cache.cached?.generation).toBe(2);
    releaseOld(buildRouteSnapshot(1, [], []));
    await Promise.resolve();
    expect(cache.cached?.generation).toBe(2);
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
    let refresh: Promise<unknown> | undefined;
    expect((await cache.get(20, pending => { refresh = pending; }))?.generation).toBe(1);
    await refresh;
    expect((await cache.get(21))?.generation).toBe(2);
    fail = true;
    expect((await cache.get(40))?.generation).toBe(2);
  });
});
