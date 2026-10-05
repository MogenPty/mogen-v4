/**
 * Lead-processing core for the audit lead form (provider-injected, testable).
 * Route handlers own rate limiting, Turnstile, and audit-ID lookup; this
 * module owns validation-independent email delivery.
 */

import { getService } from "@/data/services";
import type { MailProvider } from "@/lib/mail/mail-provider";
import {
  getAuditMailConfig,
  sendClientReportEmail,
  sendInternalAuditEmail,
  type LeadInfo,
} from "./notify";
import { scoreFindings } from "./scoring";
import type { AuditResult } from "./types";

export interface LeadInput {
  name: string;
  email: string;
  phone?: string;
  business?: string;
  service?: string;
}

export type LeadProcessResult =
  | { ok: true }
  | { ok: false; error: string; status: 500 | 502 };

const SAFE_ERROR =
  "Something went wrong. Please try again or email info@mogen.co.za.";
const CLIENT_ERROR =
  "Something went wrong sending your report. Please try again or email info@mogen.co.za.";
const INTERNAL_ERROR =
  "Something went wrong saving your details. Please try again or email info@mogen.co.za.";

/**
 * Send the client PDF to the visitor and the technical PDF + lead details
 * to the inbox. The internal email is sent FIRST so a client-email failure
 * can never swallow the lead — the caller still reports the client failure.
 *
 * A failed internal send is retried once (transient provider failures are
 * the common case). If it still fails, the failure is surfaced instead of
 * returning success: the stored audit outlives the request, so retrying the
 * form re-sends both emails and no lead is silently lost.
 */
export async function processAuditLead(
  provider: MailProvider,
  input: { lead: LeadInput; audit: AuditResult; ip?: string },
): Promise<LeadProcessResult> {
  const config = getAuditMailConfig();
  if (!config.inbox || !config.from) {
    console.error("[audit-lead] mail recipient/sender is not configured");
    return { ok: false, error: SAFE_ERROR, status: 500 };
  }

  // Emailed numbers always come from server-side scoring of the stored audit.
  const trustedSummary = scoreFindings(input.audit.findings);
  const trustedAudit: AuditResult = {
    ...input.audit,
    summary: { ...trustedSummary, score: trustedSummary.score },
  };

  const serviceName = input.lead.service
    ? (getService(input.lead.service)?.name ?? input.lead.service)
    : undefined;
  const leadInfo: LeadInfo = {
    name: input.lead.name,
    email: input.lead.email,
    ...(input.lead.phone ? { phone: input.lead.phone } : {}),
    ...(input.lead.business ? { business: input.lead.business } : {}),
    ...(serviceName ? { service: serviceName } : {}),
  };

  const internalResult = await sendInternalAuditEmail(provider, config, {
    audit: trustedAudit,
    ...(input.ip ? { ip: input.ip } : {}),
    lead: leadInfo,
  });
  if (!internalResult.success) {
    console.error(
      `[audit-lead] internal mail failed: ${internalResult.error.code} — retrying once`,
    );
    const retry = await sendInternalAuditEmail(provider, config, {
      audit: trustedAudit,
      ...(input.ip ? { ip: input.ip } : {}),
      lead: leadInfo,
    });
    if (!retry.success) {
      console.error(`[audit-lead] internal mail retry failed: ${retry.error.code}`);
      return { ok: false, error: INTERNAL_ERROR, status: 502 };
    }
  }

  const clientResult = await sendClientReportEmail(provider, config, {
    audit: trustedAudit,
    to: input.lead.email,
    name: input.lead.name,
  });
  if (!clientResult.success) {
    console.error(`[audit-lead] client mail failed: ${clientResult.error.code}`);
    return { ok: false, error: CLIENT_ERROR, status: 502 };
  }

  return { ok: true };
}
