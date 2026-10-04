import { describe, expect, it } from "vitest";
import { prevalidateUrl } from "./prevalidate";

describe("audit input pre-validation", () => {
  it("rejects garbage instantly with friendly messages", () => {
    expect(prevalidateUrl("fsfsd")).toContain("domain ending");
    expect(prevalidateUrl("")).toContain("enter your website");
    expect(prevalidateUrl("not a url")).toContain("spaces");
    expect(prevalidateUrl("ftp://example.com")).toContain("http");
  });

  it("passes plausible input to the server", () => {
    expect(prevalidateUrl("sollym.co.za")).toBeNull();
    expect(prevalidateUrl("https://example.co.za")).toBeNull();
    expect(prevalidateUrl("http://127.0.0.1")).toBeNull();
  });
});
