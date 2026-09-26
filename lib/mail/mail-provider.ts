import type { MailMessage, MailResult } from "./mail-types";

/**
 * Abstraction over email delivery.
 * Contact business logic depends only on this interface —
 * never on Resend, Nodemailer, or Google-specific types.
 */
export interface MailProvider {
  readonly name: string;
  send(message: MailMessage): Promise<MailResult>;
}
