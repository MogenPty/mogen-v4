import { afterEach, describe, expect, it, vi } from "vitest";
import {
  pinnedDispatcher,
  pinnedLookup,
  SafeFetchError,
  safeFetch,
  type FetchFunction,
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

describe("connection pinning", () => {
  it("serves only validated addresses and fails closed otherwise", async () => {
    const lookup = pinnedLookup(["93.184.216.34"]);
    const single = await new Promise<{ address: string; family: number }>((resolve, reject) => {
      lookup("example.com", {}, (err, address, family) => {
        if (err) reject(err);
        else resolve({ address: address as string, family });
      });
    });
    expect(single).toEqual({ address: "93.184.216.34", family: 4 });

    const filtered = await new Promise<string>((resolve) => {
      lookup("example.com", { family: 6 }, (err, address) => {
        resolve(err?.code ?? String(address));
      });
    });
    expect(filtered).toBe("ENOTFOUND");
  });

  it("passes a dispatcher to every fetch call", async () => {
    mockPublicDns();
    const seen: unknown[] = [];
    const fetchFn = (async (_input: string | URL, init?: RequestInit & { dispatcher?: unknown }) => {
      seen.push(init?.dispatcher);
      return htmlResponse("<html></html>");
    }) as FetchFunction;
    await safeFetch("https://example.com/", { fetchFn });
    expect(seen).toHaveLength(1);
    expect(seen[0]).toBeDefined();
  });

  it("pins the TCP connection while preserving hostname (Host/SNI)", async () => {
    const http = await import("node:http");
    const { fetch: undiciFetch } = await import("undici");
    const server = http.createServer((req, res) => {
      res.setHeader("content-type", "text/html");
      res.end(`<html><body>host:${req.headers.host}</body></html>`);
    });
    await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
    const address = server.address();
    const port = typeof address === "object" && address !== null ? address.port : 0;
    try {
      // Pinned to the server's address: succeeds with the original hostname.
      const ok = await undiciFetch(`http://localhost:${port}/`, {
        dispatcher: pinnedDispatcher(["127.0.0.1"]),
      });
      expect(ok.status).toBe(200);
      expect(await ok.text()).toContain(`host:localhost:${port}`);

      // Pinned elsewhere: the connection cannot reach the server.
      await expect(
        undiciFetch(`http://localhost:${port}/`, {
          dispatcher: pinnedDispatcher(["127.0.0.2"]),
          signal: AbortSignal.timeout(5000),
        }),
      ).rejects.toThrow();
    } finally {
      server.close();
    }
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
