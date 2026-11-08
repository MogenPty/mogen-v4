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

## Implementation checkpoint — Neon mogen-packages-dev / assets (8 November 2026)

The user has created Neon Object Storage on database branch **`mogen-packages-dev`** with bucket **`assets`**, and supplied the AWS S3 SDK example with `forcePathStyle: true`. This is the **Neon database/storage branch**, not a Git branch. The application implementation continues on Git branch `feat/neon-drizzle-web-catalogue`.

**Added now:** `drizzle/0007_private_documents.sql` (manual, additive, development only) and matching Drizzle metadata tables; read-only preflight `scripts/verify-neon-object-storage.mjs`; server-only environment variable examples. No customer documents were read or written, and no admin upload/download endpoints or signed-URL issuance are exposed.

**Your local steps:**
1. In Neon Console confirm that `mogen-packages-dev` has the `assets` bucket and that its **access is private**, not `public_read`. This must be explicitly checked: a bucket name alone does not establish privacy.
2. Put `AWS_ENDPOINT_URL_S3`, `AWS_REGION`, `AWS_ACCESS_KEY_ID`, and `AWS_SECRET_ACCESS_KEY` from that branch in `.env.local`. Do not commit values. Set `MOGEN_DOCUMENT_BUCKET=assets`.
3. Install the SDK locally and commit the resulting `package.json` **and lockfile** together to the feature branch: `pnpm add @aws-sdk/client-s3 @aws-sdk/s3-request-presigner`. `dotenv` is already present as a dev dependency and Node 26 supports `--env-file`.
4. Run `node --env-file=.env.local scripts/verify-neon-object-storage.mjs`. The command issues only `HeadBucket`; it does not list/download/upload any files.
5. Apply `drizzle/0007_private_documents.sql` manually in the Neon SQL editor for the **verified development branch only**, after inspecting it. Do **not** use `drizzle-kit migrate` until the project establishes a journal/snapshot baseline.
6. Run `pnpm typecheck` and `pnpm build`. No production routes are enabled.

**Access blocker:** current `app/(admin)/admin/page.tsx` displays user sign-in state without proving staff/admin role, and `app/(admin)/proxy.ts` matcher only protects `/account/:path*`. Upload/download endpoints **must not be added** until a server-side staff-role authority and access-denied tests exist. A login session alone is not sufficient to access signed contracts.

**Preview/branch security:** Neon Object Storage objects branch with the data. Any branch of live production may inherit signed private documents and enable access by privileged branch credentials. Use isolated production document storage/project and do not expose production document keys to preview deployments.

The sample `GetObjectCommand` presigned URL with `expiresIn: 3600` is suitable for demonstration but **not for confidential contracts**. Production URLs should have brief TTLs, only be issued after server-side authorisation, and never be logged, indexed or embedded in unauthorised responses.
