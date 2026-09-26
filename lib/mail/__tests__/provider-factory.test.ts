import { describe, expect, it } from "vitest";
import { GoogleSmtpAdapter } from "../google-smtp-adapter";
import {
  getMailProvider,
  resolveProviderName,
} from "../provider-factory";
import { ResendAdapter } from "../resend-adapter";

describe("provider factory", () => {
  it("defaults to Resend when MAIL_PROVIDER is absent", () => {
    expect(resolveProviderName({})).toBe("resend");
    expect(getMailProvider({})).toBeInstanceOf(ResendAdapter);
  });

  it("selects Resend explicitly", () => {
    expect(getMailProvider({ MAIL_PROVIDER: "resend" })).toBeInstanceOf(
      ResendAdapter,
    );
  });

  it("selects Google SMTP explicitly", () => {
    const provider = getMailProvider({
      MAIL_PROVIDER: "google-smtp",
      MAIL_SMTP_USER: "u",
      MAIL_SMTP_PASSWORD: "p",
    });
    expect(provider).toBeInstanceOf(GoogleSmtpAdapter);
  });

  it("rejects unsupported providers instead of silently picking one", () => {
    expect(() => getMailProvider({ MAIL_PROVIDER: "ses" })).toThrow(
      /Unsupported MAIL_PROVIDER/,
    );
  });
});
