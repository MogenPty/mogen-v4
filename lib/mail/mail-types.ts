/**
 * Provider-independent mail contracts.
 * No Resend / Nodemailer / Google types may leak through this module.
 */

export interface MailMessage {
  from: string;
  to: string | string[];
  subject: string;
  text?: string;
  html?: string;
  replyTo?: string;
}

export type MailErrorCode =
  | "CONFIG_ERROR"
  | "VALIDATION_ERROR"
  | "PROVIDER_ERROR"
  | "NETWORK_ERROR"
  | "UNKNOWN_ERROR";

export interface MailError {
  code: MailErrorCode;
  /** Safe, non-secret diagnostic message for server logs. */
  message: string;
}

export type MailResult =
  | { success: true; messageId?: string }
  | { success: false; error: MailError };

export function mailFailure(
  code: MailErrorCode,
  message: string,
): MailResult {
  return { success: false, error: { code, message } };
}
