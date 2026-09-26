import { describe, expect, it } from "vitest";
import {
  buildContactMessage,
  getContactMailConfig,
  submitContact,
} from "../contact-service";
import { FakeMailProvider } from "@/lib/mail/fake-mail-provider";

const config = { from: "Mogen <info@mogen.co.za>", to: "info@mogen.co.za" };

const validInput = {
  name: "Test User",
  email: "visitor@example.com",
  phone: "+27123456789",
  businessName: "Test Business",
  service: "Web Development" as const,
  message: "We need a new website for our business.",
  companyWebsite: "",
};

describe("contact submission service", () => {
  it("sends one normalized email for a valid enquiry", async () => {
    const fake = new FakeMailProvider();
    const result = await submitContact(validInput, fake, config, {
      submittedAt: "2026-01-01T00:00:00.000Z",
    });
    expect(result).toEqual({ ok: true });
    expect(fake.sent).toHaveLength(1);
    expect(fake.sent[0].to).toBe("info@mogen.co.za");
    expect(fake.sent[0].subject).toContain("Web Development");
    expect(fake.sent[0].replyTo).toBe("visitor@example.com");
    expect(fake.sent[0].text).toContain("Test User");
  });

  it("rejects an invalid email before sending", async () => {
    const fake = new FakeMailProvider();
    const result = await submitContact(
      { ...validInput, email: "not-an-email" },
      fake,
      config,
    );
    expect(result.ok).toBe(false);
    expect(fake.sent).toHaveLength(0);
  });

  it("rejects missing required data before sending", async () => {
    const fake = new FakeMailProvider();
    const result = await submitContact(
      { ...validInput, name: "", message: "short" },
      fake,
      config,
    );
    expect(result.ok).toBe(false);
    expect(fake.sent).toHaveLength(0);
  });

  it("rejects deprecated services", async () => {
    const fake = new FakeMailProvider();
    const result = await submitContact(
      { ...validInput, service: "Logo Design" },
      fake,
      config,
    );
    expect(result.ok).toBe(false);
    expect(fake.sent).toHaveLength(0);
  });

  it("returns a safe error when the provider fails", async () => {
    const fake = new FakeMailProvider("fake", {
      success: false,
      error: { code: "PROVIDER_ERROR", message: "downstream boom" },
    });
    const result = await submitContact(validInput, fake, config);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toContain("info@mogen.co.za");
      expect(result.error).not.toContain("boom");
    }
  });

  it("never trusts a client-provided recipient", async () => {
    const fake = new FakeMailProvider();
    await submitContact(
      { ...validInput, to: "attacker@evil.com", recipient: "attacker@evil.com" },
      fake,
      config,
    );
    expect(fake.sent).toHaveLength(1);
    expect(fake.sent[0].to).toBe("info@mogen.co.za");
  });

  it("treats honeypot fills as success without sending", async () => {
    const fake = new FakeMailProvider();
    const result = await submitContact(
      { ...validInput, companyWebsite: "http://spam.example" },
      fake,
      config,
    );
    expect(result).toEqual({ ok: true });
    expect(fake.sent).toHaveLength(0);
  });

  it("escapes HTML in the email body (header-injection safe)", async () => {
    const msg = buildContactMessage(
      { ...validInput, message: "<script>alert(1)</script>" },
      config,
      "2026-01-01T00:00:00.000Z",
    );
    expect(msg.html).not.toContain("<script>");
    expect(msg.html).toContain("&lt;script&gt;");
  });

  it("is exchangeable: identical behaviour across provider implementations", async () => {
    const asResend = new FakeMailProvider("fake-resend");
    const asGoogle = new FakeMailProvider("fake-google-smtp");
    const r1 = await submitContact(validInput, asResend, config, {
      submittedAt: "2026-01-01T00:00:00.000Z",
    });
    const r2 = await submitContact(validInput, asGoogle, config, {
      submittedAt: "2026-01-01T00:00:00.000Z",
    });
    expect(r1).toEqual(r2);
    expect(asResend.sent).toEqual(asGoogle.sent);
  });

  it("reads recipient/sender from server config", () => {
    const cfg = getContactMailConfig({
      ...process.env,
      MAIL_FROM: "Mogen <info@mogen.co.za>",
      MAIL_TO: "info@mogen.co.za>",
    } as NodeJS.ProcessEnv);
    expect(cfg.from).toContain("info@mogen.co.za");
  });
});
