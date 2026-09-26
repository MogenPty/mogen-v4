// Server-only: import from route handlers / server code, never from client components.
import type { MailMessage, MailResult } from "./mail-types";
import { mailFailure } from "./mail-types";
import type { MailProvider } from "./mail-provider";

export interface ResendAdapterOptions {
  apiKey: string;
}

/**
 * Primary production adapter. All Resend SDK usage stays inside this file.
 * `createClient` is injectable so unit tests can mock the SDK boundary
 * without live credentials.
 */
export class ResendAdapter implements MailProvider {
  readonly name = "resend";

  private createClient: (apiKey: string) => {
    emails: {
      send: (payload: Record<string, unknown>) => Promise<{
        data?: { id?: string } | null;
        error?: { message?: string } | null;
      }>;
    };
  };

  constructor(
    private options: ResendAdapterOptions,
    createClient?: ResendAdapter["createClient"],
  ) {
    // Lazy default keeps the `resend` import out of test bundles unless used.
    this.createClient =
      createClient ??
      ((apiKey: string) => {
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        const { Resend } = require("resend") as typeof import("resend");
        return new Resend(apiKey) as unknown as ReturnType<
          ResendAdapter["createClient"]
        >;
      });
  }

  async send(message: MailMessage): Promise<MailResult> {
    if (!this.options.apiKey) {
      return mailFailure("CONFIG_ERROR", "Resend API key is not configured.");
    }
    if (!message.to || (Array.isArray(message.to) && message.to.length === 0)) {
      return mailFailure("VALIDATION_ERROR", "Missing recipient.");
    }

    try {
      const client = this.createClient(this.options.apiKey);
      const { data, error } = await client.emails.send({
        from: message.from,
        to: message.to,
        subject: message.subject,
        ...(message.text ? { text: message.text } : {}),
        ...(message.html ? { html: message.html } : {}),
        ...(message.replyTo ? { replyTo: message.replyTo } : {}),
      });
      if (error) {
        return mailFailure(
          "PROVIDER_ERROR",
          `Resend rejected the message: ${error.message ?? "unknown error"}`,
        );
      }
      return { success: true, ...(data?.id ? { messageId: data.id } : {}) };
    } catch (err) {
      const detail = err instanceof Error ? err.message : "unknown error";
      return mailFailure("PROVIDER_ERROR", `Resend send failed: ${detail}`);
    }
  }
}
