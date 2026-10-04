import { afterEach, describe, expect, it, vi } from "vitest";
import {
  SafeFetchError,
  safeFetch,
} from "./fetcher";
import { htmlResponse, mockPublicDns, mockResponse } from "./test-helpers";

afterEach(() => {
  vi.restoreAllMocks();
});

async function codeFor(
  rawUrl: string,
  fetchFn: typeof fetch,
): Promise<string> {
  try {
    await safeFetch(rawUrl, { fetchFn });
    return "ok";
  } catch (error) {
    if (error instanceof SafeFetchError) return error.code;
    throw error;
  }
}

describe("safeFetch redirects", () => {
  it("follows a normal redirect and records the chain", async () => {
    mockPublicDns();
    const fetchFn = (async (input: string | URL | Request) => {
      const url = String(input);
      if (url === "http://example.com/") {
        return mockResponse("", { status: 301, location: "https://example.com/" });
      }
      return htmlResponse("<html><head><title>t</title></head><body></body></html>");
    }) as typeof fetch;
    const result = await safeFetch("http://example.com/", { fetchFn });
    expect(result.finalUrl).toBe("https://example.com/");
    expect(result.redirects).toEqual([{ url: "http://example.com/", status: 301 }]);
  });

  it("rejects redirect loops after the hop limit", async () => {
    mockPublicDns();
    const fetchFn = (async (input: string | URL | Request) => {
      const url = String(input);
      const next = url === "https://example.com/a" ? "https://example.com/b" : "https://example.com/a";
      return mockResponse("", { status: 302, location: next });
    }) as typeof fetch;
    expect(await codeFor("https://example.com/a", fetchFn)).toBe("too-many-redirects");
  });

  it("blocks redirects to private destinations", async () => {
    mockPublicDns();
    const fetchFn = (async (input: string | URL | Request) => {
      const url = String(input);
      if (url === "https://example.com/") {
        return mockResponse("", { status: 302, location: "http://127.0.0.1/admin" });
      }
      return htmlResponse("<html></html>");
    }) as typeof fetch;
    expect(await codeFor("https://example.com/", fetchFn)).toBe("unsafe-target");
  });
});

describe("safeFetch response limits", () => {
  it("accepts HTML under the limit", async () => {
    mockPublicDns();
    const fetchFn = (async () =>
      htmlResponse("<html><head><title>small</title></head><body>hi</body></html>")) as typeof fetch;
    expect(await codeFor("https://example.com/", fetchFn)).toBe("ok");
  });

  it("truncates HTML over 2 MB instead of buffering it all", async () => {
    mockPublicDns();
    const big = `<html><body>${"x".repeat(3 * 1024 * 1024)}</body></html>`;
    const fetchFn = (async () => htmlResponse(big)) as typeof fetch;
    const result = await safeFetch("https://example.com/", { fetchFn });
    expect(result.truncated).toBe(true);
    expect(Buffer.byteLength(result.body, "utf8")).toBeLessThanOrEqual(2 * 1024 * 1024);
  });
});
