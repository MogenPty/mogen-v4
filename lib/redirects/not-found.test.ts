import { describe, expect, it } from "vitest";
import { classifyUserAgent } from "./not-found-policy";

describe("404 user-agent classification", () => {
  it("recognizes search and AI crawlers", () => {
    expect(classifyUserAgent("Mozilla/5.0 (compatible; Googlebot/2.1)")).toBe("search");
    expect(classifyUserAgent("Mozilla/5.0; GPTBot/1.0")).toBe("ai");
  });

  it("separates browsers from automation", () => {
    expect(classifyUserAgent("Mozilla/5.0 Chrome/120 Safari/537.36")).toBe("browser");
    expect(classifyUserAgent("curl/8.0")).toBe("automation");
  });
});
