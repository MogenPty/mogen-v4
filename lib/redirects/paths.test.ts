import { describe, expect, it } from "vitest";
import {
  applyRuleDestination,
  matchRulePath,
  normalizeDestinationPath,
  normalizeImportedUrl,
  normalizeRequestPath,
  normalizeRulePath,
} from "./paths";

describe("redirect path normalization", () => {
  it("normalizes slashes, trailing slashes and unreserved percent encoding", () => {
    expect(normalizeRequestPath("/old//page/")).toBe("/old/page");
    expect(normalizeRequestPath("/%7euser/%41")).toBe("/~user/A");
    expect(normalizeRequestPath("/caf%c3%a9")).toBe("/caf%C3%A9");
    expect(normalizeRequestPath("/café/{draft}")).toBe("/caf%C3%A9/%7Bdraft%7D");
  });

  it("rejects invalid or ambiguous path input", () => {
    expect(() => normalizeRequestPath("relative")).toThrow(/one slash/i);
    expect(() => normalizeRequestPath("//evil.example/path")).toThrow(/one slash/i);
    expect(() => normalizeRequestPath("/a/%2e%2e/b")).toThrow(/dot path/i);
    expect(() => normalizeRequestPath("/bad/%zz")).toThrow(/percent/i);
    expect(() => normalizeRequestPath("/path?token=secret")).toThrow(/query/i);
    expect(() => normalizeRequestPath(`/${"é".repeat(400)}`)).toThrow(/encoded path/i);
  });

  it("canonicalizes one-segment and catch-all patterns", () => {
    expect(normalizeRulePath("/blog/:slug")).toEqual({ path: "/blog/:segment", matchType: "segment" });
    expect(normalizeRulePath("/blog/*")).toEqual({ path: "/blog/:path*", matchType: "splat" });
    expect(normalizeRulePath("/:anything")).toEqual({ path: "/:segment", matchType: "segment" });
  });

  it("rejects arbitrary patterns and open redirects", () => {
    expect(() => normalizeRulePath("https://evil.example/path")).toThrow(/same-origin/i);
    expect(() => normalizeRulePath("/blog/:year/:slug")).toThrow(/one terminal/i);
    expect(() => normalizeDestinationPath("//evil.example", "exact")).toThrow(/one slash/i);
    expect(() => normalizeDestinationPath("/articles/:path*", "segment")).toThrow(/match/i);
  });

  it("matches and expands one-segment rules", () => {
    const capture = matchRulePath("/blog/hello", "/blog/:segment", "segment");
    expect(capture).toBe("hello");
    expect(applyRuleDestination("/articles/:segment", "segment", capture!)).toBe("/articles/hello");
    expect(matchRulePath("/blog/2026/hello", "/blog/:segment", "segment")).toBeNull();
  });

  it("matches and expands catch-all rules including an empty suffix", () => {
    expect(matchRulePath("/news", "/news/:path*", "splat")).toBe("");
    const capture = matchRulePath("/news/2026/hello", "/news/:path*", "splat");
    expect(capture).toBe("2026/hello");
    expect(applyRuleDestination("/articles/:path*", "splat", capture!)).toBe("/articles/2026/hello");
    expect(applyRuleDestination("/articles", "splat", capture!)).toBe("/articles");
  });

  it("normalizes query-free Mogen URLs for imports", () => {
    expect(normalizeImportedUrl("https://www.mogen.co.za/blog/post?utm_source=test#top")).toBe("/blog/post");
    expect(() => normalizeImportedUrl("https://evil.example/blog/post")).toThrow(/Mogen/i);
  });
});
