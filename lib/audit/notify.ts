/**
 * Server-only audit email delivery.
 *
 * Two mails:
 * - Internal: full technical PDF to Mogen's inbox on every completed audit
 *   (domain + visitor IP even when the lead form is never completed), and
 *   again with full lead details when the form is completed.
 * - Client: simplified plain-English PDF to the visitor's email address.
 *
 * Email failures are reported to callers but must never fail the audit
 * itself — route handlers log and continue.
 */

import type { MailProvider } from "@/lib/mail/mail-provider";
import type { MailResult } from "@/lib/mail/mail-types";
import {
  clientPdfFilename,
  renderClientPdf,
  renderTechnicalPdf,
  technicalPdfFilename,
  type TechnicalPdfMeta,
} from "./pdf";
import type { AuditResult } from "./types";

export interface AuditMailConfig {
  from: string;
  /** Mogen inbox for technical reports. Editable via SEO_REPORT_TO. */
  inbox: string;
}

export function getAuditMailConfig(
  env: NodeJS.ProcessEnv = process.env,
): AuditMailConfig {
  return {
    from: env.MAIL_FROM ?? "Mogen <info@mogen.co.za>",
    inbox: env.SEO_REPORT_TO ?? env.MAIL_TO ?? "info@mogen.co.za",
  };
}

export interface LeadInfo {
  name: string;
  email: string;
  phone?: string;
  business?: string;
  service?: string;
}

function scoreLine(audit: AuditResult): string {
  const s = audit.summary;
  if (s.score === null) return "n/a (insufficient coverage)";
  return `${s.score}/100${s.provisional ? " (provisional)" : ""}`;
}

export async function sendInternalAuditEmail(
  provider: MailProvider,
  config: AuditMailConfig,
  input: { audit: AuditResult; ip?: string; lead?: LeadInfo },
): Promise<MailResult> {
  const { audit, ip, lead } = input;
  const meta: TechnicalPdfMeta = {
    ...(ip ? { ip } : {}),
    ...(lead ? { lead } : {}),
  };
  const pdf = renderTechnicalPdf(audit, meta);
  const s = audit.summary;
  const lines = [
    lead ? "SEO audit lead completed." : "SEO audit completed (lead form not completed).",
    "",
    `Domain: ${audit.site.domain}`,
    `Submitted URL: ${audit.site.submittedUrl}`,
    `Final URL: ${audit.site.finalUrl}`,
    ...(ip ? [`Visitor IP: ${ip}`] : []),
    `Score: ${scoreLine(audit)}`,
    `Coverage: ${Math.round(s.coverage * 100)}% (${s.assessed}/${s.applicable} assessed)`,
    `Passed / Warnings / Failed / Not assessed: ${s.passed} / ${s.warnings} / ${s.failed} / ${s.notAssessed}`,
    `Pages analysed: ${audit.crawl.pagesAnalysed}`,
    `Generated: ${audit.generatedAt}`,
  ];
  if (lead) {
    lines.push(
      "",
      "Lead details:",
      `Name: ${lead.name}`,
      `Email: ${lead.email}`,
      ...(lead.phone ? [`Phone: ${lead.phone}`] : []),
      ...(lead.business ? [`Business: ${lead.business}`] : []),
      ...(lead.service ? [`Service interest: ${lead.service}`] : []),
    );
  }
  lines.push("", "Full measurement evidence is attached as PDF.");
  return provider.send({
    from: config.from,
    to: config.inbox,
    subject: lead
      ? `SEO audit lead — ${audit.site.domain} (${scoreLine(audit)})`
      : `SEO audit — ${audit.site.domain} (${scoreLine(audit)})`,
    text: lines.join("\n"),
    ...(lead ? { replyTo: lead.email } : {}),
    attachments: [
      {
        filename: technicalPdfFilename(audit.site.domain),
        contentType: "application/pdf",
        content: pdf.toString("base64"),
      },
    ],
  });
}

export async function sendClientReportEmail(
  provider: MailProvider,
  config: AuditMailConfig,
  input: { audit: AuditResult; to: string; name?: string },
): Promise<MailResult> {
  const { audit, to, name } = input;
  const pdf = renderClientPdf(audit);
  const greeting = name ? `Hi ${name.split(" ")[0]},` : "Hi,";
  const text = [
    greeting,
    "",
    `Thanks for running the free Mogen Growth Audit on ${audit.site.domain}.`,
    "Your personalised growth report is attached as a PDF. It covers what we verified is already working well on your website, in plain English.",
    "",
    "If you would like the full prioritised blueprint — including anything that needs attention, always backed by the underlying measurement — just reply to this email or book a strategy call.",
    "",
    "Mogen — info@mogen.co.za",
  ].join("\n");
  return provider.send({
    from: config.from,
    to,
    subject: `Your Website Growth Report — ${audit.site.domain}`,
    text,
    attachments: [
      {
        filename: clientPdfFilename(audit.site.domain),
        contentType: "application/pdf",
        content: pdf.toString("base64"),
      },
    ],
  });
}
