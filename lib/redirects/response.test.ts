import { NextRequest } from "next/server";
import { describe, expect, it } from "vitest";
import { responseForRouteResolution } from "./response";

describe("redirect HTTP responses", () => {
  it.each([301, 302, 307, 308] as const)("returns %s and a same-origin Location", statusCode => {
    const request = new NextRequest("https://www.mogen.co.za/old?utm_source=test");
    const response = responseForRouteResolution(request, {
      kind: "redirect",
      ruleId: "rule-1",
      destinationPath: "/new",
      statusCode,
      preserveQuery: true,
    });
    expect(response?.status).toBe(statusCode);
    expect(response?.headers.get("location")).toBe("https://www.mogen.co.za/new?utm_source=test");
  });

  it("returns a direct 410 without a Location header", () => {
    const response = responseForRouteResolution(
      new NextRequest("https://www.mogen.co.za/removed"),
      { kind: "gone", ruleId: "gone-1" },
    );
    expect(response?.status).toBe(410);
    expect(response?.headers.get("location")).toBeNull();
    expect(response?.headers.get("cache-control")).toBe("no-store");
  });
});
