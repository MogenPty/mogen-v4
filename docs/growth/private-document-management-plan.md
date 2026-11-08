# Private Document Management — staged architecture proposal

Status: **PROPOSAL ONLY** (8 November 2026). Do not enable production uploads, create production credentials, seed real customer records or expose files publicly before security review. This proposal complements the draft Sprout commercial/legal documents; it does not publish them.

## Goal

Store Mogen's private documents, agreement templates, unsigned/signed customer agreements, quotations, invoices and version histories within the existing Next.js / Drizzle / Neon project. PostgreSQL holds metadata and access/audit records; **Neon Object Storage** private buckets hold the actual bytes (PDF, DOCX, images, ZIP). NotebookLM is optional research tooling, not the authoritative file store.

## Product preflight

- Confirm the **actual Neon project region** supports Object Storage before selecting it. Official docs list `aws-us-east-2`, `aws-us-east-1`, `aws-eu-central-1`, `aws-ap-southeast-1` (as of November 2026).
- Check current pricing, quota, permitted file sizes, backup/recovery and branch behaviour against Neon docs; do not assume SQL backups also recover object bytes.
- **Crucial:** Neon Object Storage inherits objects on database branch creation. Never clone real signed customer contracts into publicly accessible preview environments or development branches. Prefer a dedicated isolated production storage project with strictly separated development fixtures, unless Neon provides verified branch-access isolation that meets the risk assessment.
- Confirm verified server-side authentication, internal admin role, deny-by-default access, and audit logging before any upload endpoint or presigned download flow is exposed. A package dependency does NOT prove that admin authorisation already exists.
- Do not store credentials or sensitive document bytes in GitHub, public assets, HTML, client bundles, or database JSON fields.

## Staged roadmap

### Phase 0 — design and permissions
- Design admin-only `/admin/documents` UI and document access matrix (owner/admin, future customer portal).
- Establish ownership and retention policies; POPIA controls, cross-border processing review, deletion/legal hold, processor agreements, backups, disaster recovery and incident response.
- Decide whether customer-specific agreements should be stored on a separate Neon project to avoid production-to-preview branching of personal information.
- Register user/provider identifiers and signatures securely; no public access.

### Phase 1 — private document library (no e-signing yet)
- Add additive **manual SQL** migration with tables `documents`, `document_versions`, `document_access_log`, and `document_relations`; preserve the unbaselined Drizzle migration discipline of this repository.
- Metadata: UUIDv7 or UUID identifiers; document type, state, customer/project linkage, bucket/key, MIME, size, SHA-256 hash, uploader ID, creation time, retention/hold, version, security classification.
- Immutable versioned object keys, distinct dev/prod buckets, private-only access, server-side access checks before short-lived presigned downloads.
- File-type and size allowlist, validate content/magic bytes, malware scanning or quarantine before delivery, secure audit events for every read/write/download, deny-by-default roles, rate limiting.
- Use transactions and compensating cleanup for partial S3/database writes; use separate operations to avoid dangling metadata/orphan files.
- Only test with synthetic sample documents in development.

### Phase 2 — contract authoring
- Approved, immutable versioned agreement templates.
- Create customer-specific snapshot from template + pricing version + agreed commercial terms, preserving the exact sent artifact.
- PDF export, document status workflow (draft -> reviewed -> sent -> signed -> archived), with audit log and review controls.

### Phase 3 — signed agreements
- First support uploading externally signed PDFs, checksum and evidence; do not claim typed names/signature images alone are legally sufficient.
- Future digital signing needs signer identification, invitation expiry, intent-to-sign, tamper evidence, signed revision hash, email verification and evidence package. Seek ECTA/POPIA legal review and consider established e-sign providers for advanced signature use cases.
- No overwrites of executed documents. Retention/legal hold and backups are separately enforced.

### Phase 4 — customer portal (later)
- Granular per-customer access to only that customer's agreements and invoices.
- Signed URLs short-lived; no storage credentials in browser; revoke access on appropriate lifecycle event. Maintain audit records.

## Repository notes

`package.json` contains `@neondatabase/auth`, `@neondatabase/serverless`, `drizzle-orm`, Next.js and Zod. `db/schema.ts` currently models web catalogues, not a secure document vault. Validate the admin authentication/authorisation implementation rather than assuming it exists.

No live prices, signed documents or sensitive identity details should be committed to this repository.

## References

- https://neon.com/docs/storage/get-started
- https://neon.com/blog/building-neon-object-storage
- https://neon.com/docs/storage/authentication
- https://popia.co.za/section-14-retention-and-restriction-of-records/
