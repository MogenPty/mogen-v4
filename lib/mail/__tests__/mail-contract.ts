import { describe, expect, it } from "vitest";
import type { MailMessage } from "../mail-types";
import type { MailProvider } from "../mail-provider";

export const sampleMessage: MailMessage = {
  from: "Mogen <info@mogen.co.za>",
  to: "info@mogen.co.za",
  subject: "New Mogen enquiry — Web Development",
  text: "Hello",
  html: "<p>Hello</p>",
  replyTo: "visitor@example.com",
};

/**
 * Reusable behavioural contract for every MailProvider implementation.
 * Run the same suite against ResendAdapter and GoogleSmtpAdapter to prove
 * the Contact service can exchange providers without changing logic.
 */
export function runMailProviderContractTests(
  label: string,
  createProvider: () => MailProvider,
) {
  describe(`MailProvider contract: ${label}`, () => {
    it("sends a valid message successfully", async () => {
      const result = await createProvider().send({ ...sampleMessage });
      expect(result.success).toBe(true);
    });

    it("preserves subject, recipient, sender and reply-to", async () => {
      let captured: MailMessage | undefined;
      const provider = createProvider();
      const orig = provider.send.bind(provider);
      provider.send = async (msg) => {
        captured = msg;
        return orig(msg);
      };
      await provider.send({ ...sampleMessage });
      expect(captured?.subject).toBe(sampleMessage.subject);
      expect(captured?.to).toBe(sampleMessage.to);
      expect(captured?.from).toBe(sampleMessage.from);
      expect(captured?.replyTo).toBe(sampleMessage.replyTo);
    });

    it("passes html and text content", async () => {
      let captured: MailMessage | undefined;
      const provider = createProvider();
      const orig = provider.send.bind(provider);
      provider.send = async (msg) => {
        captured = msg;
        return orig(msg);
      };
      await provider.send({ ...sampleMessage });
      expect(captured?.text).toContain("Hello");
      expect(captured?.html).toContain("Hello");
    });

    it("normalizes failures to the app-level result type", async () => {
      const provider = createProvider();
      const result = await provider.send({
        ...sampleMessage,
        to: [],
      });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(typeof result.error.code).toBe("string");
        expect(typeof result.error.message).toBe("string");
      }
    });
  });
}
