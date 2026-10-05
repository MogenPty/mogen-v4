/**
 * Short-lived server-side store for completed audits.
 *
 * The lead endpoint retrieves the canonical audit by server-issued ID instead
 * of trusting caller-submitted findings (which could otherwise carry
 * fabricated evidence into the emailed PDFs).
 *
 * Same trade-off as the API rate limiters: in-memory per process, so a
 * multi-instance deployment needs an external store. Entries expire quickly
 * and the map is bounded, so a missing ID simply asks the visitor to
 * re-run the scan.
 */

import { randomUUID } from "node:crypto";
import type { AuditResult } from "./types";

const TTL_MS = 30 * 60 * 1000;
const MAX_ENTRIES = 500;

interface StoredAudit {
  audit: AuditResult;
  expiresAt: number;
}

const store = new Map<string, StoredAudit>();

function prune(now: number): void {
  for (const [id, entry] of store) {
    if (entry.expiresAt <= now) store.delete(id);
  }
  while (store.size > MAX_ENTRIES) {
    const oldest = store.keys().next();
    if (oldest.done) break;
    store.delete(oldest.value);
  }
}

/** Persist a completed audit; returns the ID issued to the client. */
export function saveAudit(audit: AuditResult): string {
  prune(Date.now());
  const id = randomUUID();
  store.set(id, { audit, expiresAt: Date.now() + TTL_MS });
  prune(Date.now());
  return id;
}

/** Retrieve a stored audit, or null when unknown/expired. */
export function getAudit(id: string): AuditResult | null {
  const entry = store.get(id);
  if (!entry) return null;
  if (entry.expiresAt <= Date.now()) {
    store.delete(id);
    return null;
  }
  return entry.audit;
}
