// Server-only: import from route handlers / server code, never from client components.
import type { MailMessage, MailResult } from "./mail-types";
import { mailFailure } from "./mail-types";
import type { MailProvider } from "./mail-provider";

export interface GoogleSmtpAdapterOptions {
  host: string;
  port: number;
  secure: boolean;
  user: string;
  /** Google App Password (2-Step Verification required). Never commit. */
  password: string;
}

interface SmtpTransport {
  sendMail: (mailOptions: Record<string, unknown>) => Promise<{
    messageId?: string;
  }>;
  close?: () => void;
}

/**
 * Secondary adapter over Google SMTP (App Password auth).
 * All Nodemailer usage stays inside this file. Structured so a future
 * OAuth2 transport can replace the password transport without changing
 * the MailProvider contract.
 */
export class GoogleSmtpAdapter implements MailProvider {
  readonly name = "google-smtp";

  private createTransport: (options: GoogleSmtpAdapterOptions) => SmtpTransport;

  constructor(
    private options: GoogleSmtpAdapterOptions,
    createTransport?: GoogleSmtpAdapter["createTransport"],
  ) {
    this.createTransport =
      createTransport ??
      ((opts) => {
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        const nodemailer = require("nodemailer") as typeof import("nodemailer");
        return nodemailer.createTransport({
          host: opts.host,
          port: opts.port,
          secure: opts.secure,
          auth: { user: opts.user, pass: opts.password },
        }) as unknown as SmtpTransport;
      });
  }

  async send(message: MailMessage): Promise<MailResult> {
    const { host, port, user, password } = this.options;
    if (!host || !port || !user || !password) {
      return mailFailure(
        "CONFIG_ERROR",
        "Google SMTP is not fully configured.",
      );
    }
    if (!message.to || (Array.isArray(message.to) && message.to.length === 0)) {
      return mailFailure("VALIDATION_ERROR", "Missing recipient.");
    }

    const transport = this.createTransport(this.options);
    try {
      const info = await transport.sendMail({
        from: message.from,
        to: message.to,
        subject: message.subject,
        ...(message.text ? { text: message.text } : {}),
        ...(message.html ? { html: message.html } : {}),
        ...(message.replyTo ? { replyTo: message.replyTo } : {}),
      });
      return {
        success: true,
        ...(info?.messageId ? { messageId: info.messageId } : {}),
      };
    } catch (err) {
      const detail = err instanceof Error ? err.message : "unknown error";
      return mailFailure("PROVIDER_ERROR", `SMTP send failed: ${detail}`);
    } finally {
      transport.close?.();
    }
  }
}
