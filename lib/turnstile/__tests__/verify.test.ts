import { describe, expect, it, vi } from "vitest";
import {
  parseExpectedHostnames,
  verifyTurnstileToken,
} from "../verify";

const base = {
  token: "valid-token",
  remoteip: "203.0.113.10",
  secret: "test-secret",
  expectedAction: "contact",
  expectedHostnames: new Set(["www.mogen.co.za"]),
};

function mockFetch(result: unknown, ok = true) {
  return vi.fn(async () =>
    new Response(JSON.stringify(result), {
      status: ok ? 200 : 500,
      headers: { "Content-Type": "application/json" },
    }),
  );
}

describe("verifyTurnstileToken", () => {
  it("accepts a valid token with matching action and hostname", async () => {
    const fetchFn = mockFetch({
      success: true,
      action: "contact",
      hostname: "www.mogen.co.za",
    });
    const result = await verifyTurnstileToken({ ...base, fetchFn });
    expect(result).toEqual({ ok: true, hostname: "www.mogen.co.za" });
    expect(fetchFn).toHaveBeenCalledOnce();
  });

  it("rejects a missing or oversized token without calling siteverify", async () => {
    const fetchFn = mockFetch({ success: true });
    for (const token of ["", undefined, "x".repeat(2049)]) {
      const result = await verifyTurnstileToken({
        ...base,
        token,
        fetchFn,
      });
      expect(result).toEqual({ ok: false, reason: "missing-token" });
    }
    expect(fetchFn).not.toHaveBeenCalled();
  });

  it("fails closed when the server is misconfigured", async () => {
    const fetchFn = mockFetch({ success: true });
    expect(
      await verifyTurnstileToken({ ...base, secret: undefined, fetchFn }),
    ).toEqual({ ok: false, reason: "misconfigured" });
    expect(
      await verifyTurnstileToken({
        ...base,
        expectedHostnames: new Set(),
        fetchFn,
      }),
    ).toEqual({ ok: false, reason: "misconfigured" });
    expect(fetchFn).not.toHaveBeenCalled();
  });

  it("rejects a mismatched action", async () => {
    const result = await verifyTurnstileToken({
      ...base,
      fetchFn: mockFetch({
        success: true,
        action: "signup",
        hostname: "www.mogen.co.za",
      }),
    });
    expect(result).toEqual({ ok: false, reason: "rejected" });
  });

  it("rejects an unlisted hostname", async () => {
    const result = await verifyTurnstileToken({
      ...base,
      fetchFn: mockFetch({
        success: true,
        action: "contact",
        hostname: "evil.example",
      }),
    });
    expect(result).toEqual({ ok: false, reason: "rejected" });
  });

  it("rejects a provider failure", async () => {
    const result = await verifyTurnstileToken({
      ...base,
      fetchFn: mockFetch({ success: false }),
    });
    expect(result).toEqual({ ok: false, reason: "rejected" });
  });

  it("fails closed on transport and network errors", async () => {
    expect(
      await verifyTurnstileToken({
        ...base,
        fetchFn: mockFetch({ success: true }, false),
      }),
    ).toEqual({ ok: false, reason: "error" });
    expect(
      await verifyTurnstileToken({
        ...base,
        fetchFn: vi.fn(async () => {
          throw new Error("network down");
        }),
      }),
    ).toEqual({ ok: false, reason: "error" });
  });
});

describe("parseExpectedHostnames", () => {
  it("parses a comma-separated allowlist", () => {
    expect(
      parseExpectedHostnames("www.mogen.co.za, mogen.co.za "),
    ).toEqual(new Set(["www.mogen.co.za", "mogen.co.za"]));
  });

  it("returns an empty set when unconfigured", () => {
    expect(parseExpectedHostnames(undefined)).toEqual(new Set());
  });
});
