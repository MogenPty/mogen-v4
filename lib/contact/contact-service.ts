import { z } from "zod";
import type { MailProvider } from "@/lib/mail/mail-provider";
import type { MailResult } from "@/lib/mail/mail-types";
import type { MailMessage as Message } from "@/lib/mail/mail-types";

export const CONTACT_SERVICES = [
  "Web Development",
  "SEO",
  "Digital Marketing",
  "Business Documentation",
  "Other",
] as const;

export type ContactService = (typeof CONTACT_SERVICES)[number];

export const contactInputSchema = z.object({
  name: z.string().trim().min(2, "Name is required.").max(120),
  email: z.string().trim().email("A valid email is required.").max(254),
  phone: z.string().trim().max(40).optional().default(""),
  businessName: z.string().trim().max(160).optional().default(""),
  service: z.enum(CONTACT_SERVICES),
  message: z.string().trim().min(10, "Please add a few details (min 10 characters).").max(5000),
  // Honeypot — must stay empty. Checked server-side.
  companyWebsite: z.string().max(200).optional().default(""),
});

export type ContactInput = z.infer<typeof contactInputSchema>;

export interface ContactMailConfig {
  from: string;
  to: string | string[];
}

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

/** Strip CR/LF to prevent header injection in subject / reply-to. */
function sanitizeHeader(value: string): string {
  return value.replace(/[\r\n]+/g, " ").trim();
}

export function buildContactSubject(input: Pick<ContactInput, "service">): string {
  if (input.service === "Other") return "New Mogen website enquiry";
  return `New Mogen enquiry — ${sanitizeHeader(input.service)}`;
}

export function buildContactText(input: ContactInput, submittedAt: string): string {
  const lines = [
    "New enquiry from mogen.co.za/contact",
    "",
    `Name: ${input.name}`,
    `Email: ${input.email}`,
    ...(input.phone ? [`Phone: ${input.phone}`] : []),
    ...(input.businessName ? [`Business: ${input.businessName}`] : []),
    `Service: ${input.service}`,
    `Submitted: ${submittedAt}`,
    "",
    "Message:",
    input.message,
  ];
  return lines.join("\n");
}

export function buildContactHtml(input: ContactInput, submittedAt: string): string {
  const row = (label: string, value: string) =>
    `<tr><td style="padding:4px 12px 4px 0;color:#666">${escapeHtml(label)}</td><td style="padding:4px 0">${escapeHtml(value)}</td></tr>`;
  const optional = [
    input.phone ? row("Phone", input.phone) : "",
    input.businessName ? row("Business", input.businessName) : "",
  ].join("");
  return `<div style="font-family:sans-serif;max-width:600px"><h2>New Mogen enquiry</h2><table><tbody>${row("Name", input.name)}${row("Email", input.email)}${optional}${row("Service", input.service)}${row("Submitted", submittedAt)}</tbody></table><p style="color:#666">Message</p><p>${escapeHtml(input.message).replaceAll("\n", "<br>")}</p></div>`;
}

export function buildContactMessage(
  input: ContactInput,
  config: ContactMailConfig,
  submittedAt = new Date().toISOString(),
): Message {
  return {
    from: config.from,
    to: config.to,
    subject: buildContactSubject(input),
    text: buildContactText(input, submittedAt),
    html: buildContactHtml(input, submittedAt),
    replyTo: sanitizeHeader(input.email),
  };
}

export type ContactSubmissionResult =
  | { ok: true }
  | { ok: false; error: string; fieldErrors?: Record<string, string> };

const SAFE_USER_ERROR =
  "Something went wrong sending your message. Please try again or email info@mogen.co.za.";

/**
 * Provider-independent submission. Depends only on MailProvider —
 * swapping Resend <-> Google SMTP requires no change here.
 */
export async function submitContact(
  rawInput: unknown,
  provider: MailProvider,
  config: ContactMailConfig,
  opts: { submittedAt?: string } = {},
): Promise<ContactSubmissionResult> {
  const parsed = contactInputSchema.safeParse(rawInput);
  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      const key = issue.path.join(".") || "form";
      if (!fieldErrors[key]) fieldErrors[key] = issue.message;
    }
    return { ok: false, error: "Please check the highlighted fields.", fieldErrors };
  }
  const input = parsed.data;

  // Honeypot: pretend success so bots learn nothing.
  if (input.companyWebsite) return { ok: true };

  // Recipient always comes from server config — never the client.
  if (!config.to || (Array.isArray(config.to) && config.to.length === 0) || !config.from) {
    console.error("[contact] mail recipient/sender is not configured");
    return { ok: false, error: SAFE_USER_ERROR };
  }

  const message: Message = buildContactMessage(
    input,
    config,
    opts.submittedAt ?? new Date().toISOString(),
  );

  const result: MailResult = await provider.send(message);
  if (!result.success) {
    // Log diagnostics server-side without secrets; user gets a safe message.
    console.error(`[contact] provider "${provider.name}" failed: ${result.error.code}`);
    return { ok: false, error: SAFE_USER_ERROR };
  }
  return { ok: true };
}

export function getContactMailConfig(env: NodeJS.ProcessEnv = process.env): ContactMailConfig {
  return {
    from: env.MAIL_FROM ?? "Mogen <info@mogen.co.za>",
    to: env.MAIL_TO ?? "info@mogen.co.za",
  };
}
