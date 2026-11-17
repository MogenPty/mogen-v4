import { describe, expect, it } from "vitest";
import {
  assertRuleDoesNotOverrideProtectedRoute,
  assertSafeRedirectDestination,
  isProtectedApplicationPath,
} from "./policy";

describe("redirect route policy", () => {
  it.each(["/admin", "/admin/redirects", "/api/contact", "/_next/static/file.js", "/_vercel/insights", "/auth/sign-in"])(
    "protects %s",
    path => expect(isProtectedApplicationPath(path)).toBe(true),
  );

  it("allows normal public paths", () => {
    expect(isProtectedApplicationPath("/articles/old-post")).toBe(false);
    expect(() => assertRuleDoesNotOverrideProtectedRoute("/blog/:path*", "splat")).not.toThrow();
  });

  it("rejects broad and internal source rules", () => {
    expect(() => assertRuleDoesNotOverrideProtectedRoute("/:path*", "splat")).toThrow(/site-wide/i);
    expect(() => assertRuleDoesNotOverrideProtectedRoute("/api/:path*", "splat")).toThrow(/cannot override/i);
  });

  it("rejects internal destinations", () => {
    expect(() => assertSafeRedirectDestination("/admin")).toThrow(/internal/i);
  });
});
