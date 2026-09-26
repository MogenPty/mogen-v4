import { describe, expect, it, vi } from "vitest";
import { ResendAdapter } from "../resend-adapter";
import { runMailProviderContractTests, sampleMessage } from "./mail-contract";

function successClient(sent: Record<string, unknown>[]) {
  return () => ({
    emails: {
      send: async (payload: Record<string, unknown>) => {
        sent.push(payload);
        return { data: { id: "resend-id-1" }, error: null };
      },
    },
  });
}

runMailProviderContractTests("ResendAdapter", () => {
  const sent: Record<string, unknown>[] = [];
  return new ResendAdapter({ apiKey: "test-key" }, successClient(sent));
});

describe("ResendAdapter translation", () => {
  it("translates MailMessage to the Resend request shape", async () => {
    const sent: Record<string, unknown>[] = [];
    const adapter = new ResendAdapter(
      { apiKey: "test-key" },
      successClient(sent),
    );
    await adapter.send({ ...sampleMessage });
    expect(sent).toHaveLength(1);
    expect(sent[0]).toMatchObject({
      from: sampleMessage.from,
      to: sampleMessage.to,
      subject: sampleMessage.subject,
      replyTo: sampleMessage.replyTo,
    });
  });

  it("normalizes the Resend id to messageId", async () => {
    const adapter = new ResendAdapter(
      { apiKey: "test-key" },
      successClient([]),
    );
    const result = await adapter.send({ ...sampleMessage });
    expect(result).toEqual({ success: true, messageId: "resend-id-1" });
  });

  it("normalizes Resend API errors", async () => {
    const adapter = new ResendAdapter({ apiKey: "test-key" }, () => ({
      emails: {
        send: async () => ({ data: null, error: { message: "boom" } }),
      },
    }));
    const result = await adapter.send({ ...sampleMessage });
    expect(result.success).toBe(false);
    if (!result.success) expect(result.error.code).toBe("PROVIDER_ERROR");
  });

  it("normalizes thrown errors", async () => {
    const adapter = new ResendAdapter({ apiKey: "test-key" }, () => ({
      emails: {
        send: async () => {
          throw new Error("network down");
        },
      },
    }));
    const result = await adapter.send({ ...sampleMessage });
    expect(result.success).toBe(false);
  });

  it("requires an API key from server configuration", async () => {
    const adapter = new ResendAdapter({ apiKey: "" }, successClient([]));
    const result = await adapter.send({ ...sampleMessage });
    expect(result.success).toBe(false);
    if (!result.success) expect(result.error.code).toBe("CONFIG_ERROR");
  });

  it("returns only the normalized result shape", async () => {
    const sent: Record<string, unknown>[] = [];
    const adapter = new ResendAdapter(
      { apiKey: "test-key" },
      successClient(sent),
    );
    const result = await adapter.send({ ...sampleMessage });
    expect(Object.keys(result).sort()).toEqual(["messageId", "success"]);
    expect(vi.isMockFunction(adapter.send)).toBe(false);
  });
});
