import { describe, expect, it } from "vitest";
import { suggestGscDestination } from "./gsc";

const redirects = [{ sourcePath: "/legacy", destinationPath: "/services", matchType: "exact" as const }];
const pages = new Set(["/contact"]);
const articles = new Set(["local-seo-guide"]);
const promotions = new Set(["spring-offer"]);

describe("Search Console suggestions", () => {
  it("prefers an existing redirect", () => {
    const suggestion = suggestGscDestination("/legacy", redirects, pages, articles, promotions);
    expect(suggestion.destination).toBeNull();
    expect(suggestion.reason).toContain("/services");
  });

  it("does not redirect a current page", () => {
    expect(suggestGscDestination("/contact", redirects, pages, articles, promotions).destination).toBeNull();
  });

  it("recognizes paths already covered by wildcard redirects", () => {
    const wildcard = [{ sourcePath: "/blog/:path*", destinationPath: "/articles/:path*", matchType: "splat" as const }];
    const suggestion = suggestGscDestination("/blog/guides/local-seo", wildcard, pages, articles, promotions);
    expect(suggestion.destination).toBeNull();
    expect(suggestion.reason).toContain("/articles/guides/local-seo");
  });

  it("suggests only exact known slug matches", () => {
    expect(suggestGscDestination("/blog/local-seo-guide", redirects, pages, articles, promotions).destination).toBe("/articles/local-seo-guide");
    expect(suggestGscDestination("/almost-local-seo-guide", redirects, pages, articles, promotions).destination).toBeNull();
  });
});
