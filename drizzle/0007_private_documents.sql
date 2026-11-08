-- DEVELOPMENT ONLY. Apply manually to Neon branch mogen-packages-dev after
-- verifying the branch/project identity. No production schema changes authorised.
-- This file adds metadata and audit records ONLY; document bytes belong in
-- Neon Object Storage private assets bucket.
-- Do NOT use drizzle-kit migrate until journal/snapshots have been baselined.
BEGIN;

CREATE TABLE IF NOT EXISTS private_documents (
  id uuid PRIMARY KEY,
  title text NOT NULL CHECK (length(trim(title)) BETWEEN 1 AND 240),
  document_type text NOT NULL CHECK (document_type IN
    ('agreement', 'signed_agreement', 'quotation', 'invoice', 'policy', 'template', 'supporting', 'other')),
  status text NOT NULL DEFAULT 'draft' CHECK (status IN
    ('draft', 'reviewed', 'sent', 'signed', 'archived')),
  classification text NOT NULL DEFAULT 'confidential' CHECK (classification IN
    ('internal', 'confidential', 'restricted')),
  related_customer_id text,
  created_by text NOT NULL,
  current_version integer NOT NULL DEFAULT 0 CHECK (current_version >= 0),
  legal_hold boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS private_document_versions (
  id uuid PRIMARY KEY,
  document_id uuid NOT NULL REFERENCES private_documents(id) ON DELETE RESTRICT,
  version_number integer NOT NULL CHECK (version_number >= 1),
  bucket text NOT NULL DEFAULT 'assets' CHECK (bucket = 'assets'),
  object_key text NOT NULL UNIQUE CHECK (object_key LIKE 'private/documents/%'),
  original_filename text NOT NULL,
  content_type text NOT NULL,
  size_bytes bigint NOT NULL CHECK (size_bytes BETWEEN 1 AND 26214400),
  sha256_hex text NOT NULL CHECK (sha256_hex ~ '^[a-f0-9]{64}$'),
  uploaded_by text NOT NULL,
  scan_status text NOT NULL DEFAULT 'pending' CHECK (scan_status IN
    ('pending', 'clean', 'blocked')),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (document_id, version_number)
);
CREATE INDEX IF NOT EXISTS private_document_versions_doc_idx
  ON private_document_versions (document_id, version_number DESC);
CREATE INDEX IF NOT EXISTS private_documents_customer_idx
  ON private_documents (related_customer_id);

CREATE TABLE IF NOT EXISTS private_document_access_log (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  document_id uuid REFERENCES private_documents(id) ON DELETE SET NULL,
  version_id uuid REFERENCES private_document_versions(id) ON DELETE SET NULL,
  actor_id text NOT NULL,
  action text NOT NULL CHECK (action IN
    ('create', 'upload', 'download', 'view', 'metadata_update', 'status_change', 'access_denied', 'archive')),
  outcome text NOT NULL CHECK (outcome IN ('success', 'failure')),
  reason text,
  occurred_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS private_doc_log_doc_idx
  ON private_document_access_log (document_id, occurred_at DESC);

-- These tables are ONLY for trusted server-side service-role access; user
-- sessions must be authorised against an explicit admin role before reaching
-- them. They must NOT be exposed by broad Data API privileges.
COMMIT;
