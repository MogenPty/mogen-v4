// Server-only: import from route handlers / server code, never from client components.
import { GoogleSmtpAdapter } from "./google-smtp-adapter";
import type { MailProvider } from "./mail-provider";
import { ResendAdapter } from "./resend-adapter";

export type MailProviderName = "resend" | "google-smtp";

export interface MailEnv {
  MAIL_PROVIDER?: string;
  RESEND_API_KEY?: string;
  MAIL_SMTP_HOST?: string;
  MAIL_SMTP_PORT?: string;
  MAIL_SMTP_SECURE?: string;
  MAIL_SMTP_USER?: string;
  MAIL_SMTP_PASSWORD?: string;
}

function readEnv(): MailEnv {
  return process.env as unknown as MailEnv;
}

/** Explicit provider selection. No silent fallback between providers. */
export function resolveProviderName(env: MailEnv = readEnv()): MailProviderName {
  const raw = (env.MAIL_PROVIDER ?? "resend").trim().toLowerCase();
  if (raw === "resend") return "resend";
  if (raw === "google-smtp" || raw === "google_smtp" || raw === "smtp") {
    return "google-smtp";
  }
  throw new Error(
    `Unsupported MAIL_PROVIDER "${env.MAIL_PROVIDER}". Expected "resend" or "google-smtp".`,
  );
}

function parsePort(value: string | undefined, fallback: number): number {
  const n = Number.parseInt(value ?? "", 10);
  return Number.isFinite(n) ? n : fallback;
}

function parseSecure(value: string | undefined, fallback: boolean): boolean {
  if (value == null) return fallback;
  return value.trim().toLowerCase() === "true";
}

/** Composition root: the only place that branches on provider name. */
export function getMailProvider(env: MailEnv = readEnv()): MailProvider {
  const name = resolveProviderName(env);
  if (name === "google-smtp") {
    return new GoogleSmtpAdapter({
      host: env.MAIL_SMTP_HOST ?? "smtp.gmail.com",
      port: parsePort(env.MAIL_SMTP_PORT, 465),
      secure: parseSecure(env.MAIL_SMTP_SECURE, true),
      user: env.MAIL_SMTP_USER ?? "",
      password: env.MAIL_SMTP_PASSWORD ?? "",
    });
  }
  return new ResendAdapter({ apiKey: env.RESEND_API_KEY ?? "" });
}
