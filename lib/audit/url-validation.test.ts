import dns from "node:dns";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  UrlValidationError,
  validateUrlForFetch,
} from "./url-validation";
import { mockPublicDns } from "./test-helpers";

afterEach(() => {
  vi.restoreAllMocks();
});

async function codeFor(raw: string): Promise<string> {
  try {
    await validateUrlForFetch(raw);
    return "accepted";
  } catch (error) {
    if (error instanceof UrlValidationError) return error.code;
    throw error;
  }
}

describe("URL validation", () => {
  it("accepts https and http URLs", async () => {
    mockPublicDns();
    expect(await codeFor("https://example.com")).toBe("accepted");
    expect(await codeFor("http://example.com")).toBe("accepted");
  });

  it("adds https when the scheme is omitted", async () => {
    mockPublicDns();
    const result = await validateUrlForFetch("example.com");
    expect(result.url.startsWith("https://")).toBe(true);
  });

  it("rejects bare single-label names without DNS", async () => {
    expect(await codeFor("fsfsd")).toBe("invalid-url");
  });

  it("rejects localhost and loopback literals", async () => {
    expect(await codeFor("http://localhost")).toBe("blocked-host");
    expect(await codeFor("http://127.0.0.1")).toBe("blocked-ip");
    expect(await codeFor("http://[::1]/")).toBe("blocked-ip");
    expect(await codeFor("http://[::]/")).toBe("blocked-ip");
  });

  it("blocks the full fe80::/10 link-local range, not just fe80", async () => {
    expect(await codeFor("http://[fe80::1]/")).toBe("blocked-ip");
    expect(await codeFor("http://[fe90::1]/")).toBe("blocked-ip");
    expect(await codeFor("http://[febf::1]/")).toBe("blocked-ip");
    expect(await codeFor("http://[FE80::1]/")).toBe("blocked-ip");
    expect(await codeFor("http://[fc00::1]/")).toBe("blocked-ip");
    expect(await codeFor("http://[ff02::1]/")).toBe("blocked-ip");
  });

  it("decodes embedded IPv4 in mapped, compatible and NAT64 forms", async () => {
    expect(await codeFor("http://[::ffff:127.0.0.1]/")).toBe("blocked-ip");
    expect(await codeFor("http://[::ffff:7f00:1]/")).toBe("blocked-ip");
    expect(await codeFor("http://[::192.168.1.1]/")).toBe("blocked-ip");
    expect(await codeFor("http://[64:ff9b::c0a8:101]/")).toBe("blocked-ip");
  });

  it("accepts public embedded IPv4 without over-blocking", async () => {
    expect(await codeFor("http://[::ffff:5dB8:d822]/")).toBe("accepted");
    expect(await codeFor("http://[64:ff9b::5db8:d822]/")).toBe("accepted");
  });

  it("rejects private network ranges", async () => {
    expect(await codeFor("http://192.168.1.1")).toBe("blocked-ip");
    expect(await codeFor("http://10.0.0.1")).toBe("blocked-ip");
    expect(await codeFor("http://172.16.5.4")).toBe("blocked-ip");
    expect(await codeFor("http://172.31.255.255")).toBe("blocked-ip");
    expect(await codeFor("http://169.254.169.254")).toBe("blocked-ip");
  });

  it("rejects non-http protocols", async () => {
    expect(await codeFor("ftp://example.com")).toBe("unsupported-protocol");
    expect(await codeFor("file:///etc/passwd")).toBe("unsupported-protocol");
  });

  it("rejects non-standard ports", async () => {
    mockPublicDns();
    expect(await codeFor("http://example.com:8080/")).toBe("blocked-port");
  });

  it("blocks DNS rebinding to private IPs", async () => {
    vi.spyOn(dns.promises, "lookup").mockImplementation(
      (async () => [{ address: "192.168.1.10", family: 4 }]) as unknown as typeof dns.promises.lookup,
    );
    expect(await codeFor("https://example.com")).toBe("blocked-ip");
  });

  it("fails closed on unresolvable hosts", async () => {
    vi.spyOn(dns.promises, "lookup").mockRejectedValue(new Error("ENOTFOUND"));
    expect(await codeFor("https://example.com")).toBe("dns-failed");
  });
});
