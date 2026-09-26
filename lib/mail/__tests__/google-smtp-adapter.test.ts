import { describe, expect, it } from "vitest";
import { GoogleSmtpAdapter } from "../google-smtp-adapter";
import { runMailProviderContractTests, sampleMessage } from "./mail-contract";

const opts = {
  host: "smtp.gmail.com",
  port: 465,
  secure: true,
  user: "test@example.com",
  password: "app-password",
};

function successTransport(sent: Record<string, unknown>[]) {
  return () => ({
    sendMail: async (mailOptions: Record<string, unknown>) => {
      sent.push(mailOptions);
      return { messageId: "smtp-id-1" };
    },
    close: () => {},
  });
}

runMailProviderContractTests(
  "GoogleSmtpAdapter",
  () => new GoogleSmtpAdapter(opts, successTransport([])),
);

describe("GoogleSmtpAdapter translation", () => {
  it("translates MailMessage to the SMTP mail options", async () => {
    const sent: Record<string, unknown>[] = [];
    const adapter = new GoogleSmtpAdapter(opts, successTransport(sent));
    await adapter.send({ ...sampleMessage });
    expect(sent).toHaveLength(1);
    expect(sent[0]).toMatchObject({
      from: sampleMessage.from,
      to: sampleMessage.to,
      subject: sampleMessage.subject,
      replyTo: sampleMessage.replyTo,
    });
  });

  it("normalizes the SMTP messageId", async () => {
    const adapter = new GoogleSmtpAdapter(opts, successTransport([]));
    const result = await adapter.send({ ...sampleMessage });
    expect(result).toEqual({ success: true, messageId: "smtp-id-1" });
  });

  it("normalizes SMTP errors", async () => {
    const adapter = new GoogleSmtpAdapter(opts, () => ({
      sendMail: async () => {
        throw new Error("535 auth failed");
      },
    }));
    const result = await adapter.send({ ...sampleMessage });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.code).toBe("PROVIDER_ERROR");
      // Normalized message must not leak credentials.
      expect(result.error.message).not.toContain("app-password");
    }
  });

  it("requires full SMTP configuration", async () => {
    const adapter = new GoogleSmtpAdapter(
      { ...opts, password: "" },
      successTransport([]),
    );
    const result = await adapter.send({ ...sampleMessage });
    expect(result.success).toBe(false);
    if (!result.success) expect(result.error.code).toBe("CONFIG_ERROR");
  });
});
