-- Redirect management foundation and the verified next.config.ts inventory.
-- Apply to development first. Existing configured redirects remain active
-- until HTTP parity is verified and next.config.ts is disabled in code.
BEGIN;

CREATE TABLE IF NOT EXISTS public.redirect_rules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source_path text NOT NULL,
  destination_path text NOT NULL,
  match_type text NOT NULL DEFAULT 'exact',
  status_code integer NOT NULL DEFAULT 308,
  is_active boolean NOT NULL DEFAULT true,
  is_automatic boolean NOT NULL DEFAULT false,
  preserve_query boolean NOT NULL DEFAULT true,
  entity_type text,
  entity_id text,
  description text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_by text NOT NULL,
  expires_at timestamptz,
  hit_count bigint NOT NULL DEFAULT 0,
  last_hit_at timestamptz,
  CONSTRAINT redirect_rules_status_code_check CHECK (status_code IN (301, 302, 307, 308)),
  CONSTRAINT redirect_rules_match_type_check CHECK (match_type IN ('exact', 'segment', 'splat')),
  CONSTRAINT redirect_rules_source_shape_check CHECK (
    source_path LIKE '/%'
    AND source_path NOT LIKE '//%'
    AND position('?' IN source_path) = 0
    AND position('#' IN source_path) = 0
    AND (
      (match_type = 'exact' AND position(':' IN source_path) = 0 AND position('*' IN source_path) = 0)
      OR (match_type = 'segment' AND source_path ~ '/:segment$')
      OR (match_type = 'splat' AND source_path ~ '/:path\*$')
    )
  ),
  CONSTRAINT redirect_rules_destination_shape_check CHECK (
    destination_path LIKE '/%'
    AND destination_path NOT LIKE '//%'
    AND position('?' IN destination_path) = 0
    AND position('#' IN destination_path) = 0
  ),
  CONSTRAINT redirect_rules_entity_check CHECK (
    is_automatic = false OR (entity_type IS NOT NULL AND entity_id IS NOT NULL)
  ),
  CONSTRAINT redirect_rules_exact_loop_check CHECK (
    match_type <> 'exact' OR source_path <> destination_path
  )
);

CREATE UNIQUE INDEX IF NOT EXISTS redirect_rules_active_source_unique
  ON public.redirect_rules (source_path) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS redirect_rules_lookup_idx
  ON public.redirect_rules (is_active, source_path, expires_at);
CREATE INDEX IF NOT EXISTS redirect_rules_entity_idx
  ON public.redirect_rules (entity_type, entity_id);
CREATE INDEX IF NOT EXISTS redirect_rules_updated_idx
  ON public.redirect_rules (updated_at);

CREATE TABLE IF NOT EXISTS public.gone_resource_rules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source_path text NOT NULL,
  match_type text NOT NULL DEFAULT 'exact',
  is_active boolean NOT NULL DEFAULT true,
  description text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_by text NOT NULL,
  expires_at timestamptz,
  hit_count bigint NOT NULL DEFAULT 0,
  last_hit_at timestamptz,
  CONSTRAINT gone_rules_match_type_check CHECK (match_type IN ('exact', 'segment', 'splat')),
  CONSTRAINT gone_rules_source_shape_check CHECK (
    source_path LIKE '/%'
    AND source_path NOT LIKE '//%'
    AND position('?' IN source_path) = 0
    AND position('#' IN source_path) = 0
    AND (
      (match_type = 'exact' AND position(':' IN source_path) = 0 AND position('*' IN source_path) = 0)
      OR (match_type = 'segment' AND source_path ~ '/:segment$')
      OR (match_type = 'splat' AND source_path ~ '/:path\*$')
    )
  )
);

CREATE UNIQUE INDEX IF NOT EXISTS gone_rules_active_source_unique
  ON public.gone_resource_rules (source_path) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS gone_rules_lookup_idx
  ON public.gone_resource_rules (is_active, source_path, expires_at);

-- Cross-table active-source ownership cannot be expressed by a normal unique
-- index. Serialize route-rule writes and reject an active redirect/410 clash.
CREATE OR REPLACE FUNCTION public.enforce_route_rule_source_exclusivity()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  PERFORM pg_advisory_xact_lock(hashtextextended('mogen:route-rule-writes', 0));
  IF NEW.is_active THEN
    IF TG_TABLE_NAME = 'redirect_rules' AND EXISTS (
      SELECT 1 FROM public.gone_resource_rules
      WHERE source_path = NEW.source_path AND is_active = true
    ) THEN
      RAISE EXCEPTION 'active route source % is already owned by a 410 rule', NEW.source_path
        USING ERRCODE = '23505';
    ELSIF TG_TABLE_NAME = 'gone_resource_rules' AND EXISTS (
      SELECT 1 FROM public.redirect_rules
      WHERE source_path = NEW.source_path AND is_active = true
    ) THEN
      RAISE EXCEPTION 'active route source % is already owned by a redirect rule', NEW.source_path
        USING ERRCODE = '23505';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS redirect_rules_source_exclusivity ON public.redirect_rules;
CREATE TRIGGER redirect_rules_source_exclusivity
  BEFORE INSERT OR UPDATE OF source_path, is_active ON public.redirect_rules
  FOR EACH ROW EXECUTE FUNCTION public.enforce_route_rule_source_exclusivity();

DROP TRIGGER IF EXISTS gone_rules_source_exclusivity ON public.gone_resource_rules;
CREATE TRIGGER gone_rules_source_exclusivity
  BEFORE INSERT OR UPDATE OF source_path, is_active ON public.gone_resource_rules
  FOR EACH ROW EXECUTE FUNCTION public.enforce_route_rule_source_exclusivity();

CREATE TABLE IF NOT EXISTS public.redirect_history (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  redirect_id uuid REFERENCES public.redirect_rules(id) ON DELETE SET NULL,
  gone_rule_id uuid REFERENCES public.gone_resource_rules(id) ON DELETE SET NULL,
  action text NOT NULL,
  actor text NOT NULL,
  before_state jsonb,
  after_state jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT redirect_history_action_check CHECK (
    action IN ('create', 'update', 'enable', 'disable', 'delete', 'import', 'automatic')
  )
);

CREATE INDEX IF NOT EXISTS redirect_history_redirect_idx
  ON public.redirect_history (redirect_id, created_at);
CREATE INDEX IF NOT EXISTS redirect_history_gone_idx
  ON public.redirect_history (gone_rule_id, created_at);
CREATE INDEX IF NOT EXISTS redirect_history_created_idx
  ON public.redirect_history (created_at);

CREATE TABLE IF NOT EXISTS public.redirect_cache_state (
  key text PRIMARY KEY,
  generation bigint NOT NULL DEFAULT 1,
  updated_at timestamptz NOT NULL DEFAULT now()
);

INSERT INTO public.redirect_cache_state (key, generation)
VALUES ('redirects', 1)
ON CONFLICT (key) DO NOTHING;

CREATE TABLE IF NOT EXISTS public.not_found_paths (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  requested_path text NOT NULL,
  first_seen_at timestamptz NOT NULL DEFAULT now(),
  last_seen_at timestamptz NOT NULL DEFAULT now(),
  hit_count bigint NOT NULL DEFAULT 1,
  referrer text,
  user_agent_class text NOT NULL DEFAULT 'unknown',
  resolution_status text NOT NULL DEFAULT 'open',
  resolution_redirect_id uuid REFERENCES public.redirect_rules(id) ON DELETE SET NULL,
  retain_until timestamptz NOT NULL,
  CONSTRAINT not_found_paths_status_check CHECK (
    resolution_status IN ('open', 'redirected', 'gone', 'ignored')
  ),
  CONSTRAINT not_found_paths_ua_check CHECK (
    user_agent_class IN ('browser', 'search', 'ai', 'social', 'automation', 'unknown')
  )
);

CREATE UNIQUE INDEX IF NOT EXISTS not_found_paths_requested_unique
  ON public.not_found_paths (requested_path);
CREATE INDEX IF NOT EXISTS not_found_paths_open_hits_idx
  ON public.not_found_paths (resolution_status, hit_count DESC, last_seen_at DESC);
CREATE INDEX IF NOT EXISTS not_found_paths_retention_idx
  ON public.not_found_paths (retain_until);

CREATE TABLE IF NOT EXISTS public.search_console_imports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  filename text NOT NULL,
  imported_by text NOT NULL,
  row_count integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT search_console_imports_row_count_check CHECK (row_count >= 0)
);

CREATE TABLE IF NOT EXISTS public.search_console_import_rows (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  import_id uuid NOT NULL REFERENCES public.search_console_imports(id) ON DELETE CASCADE,
  source_path text NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  suggested_destination text,
  suggestion_reason text,
  created_redirect_id uuid REFERENCES public.redirect_rules(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT search_console_rows_status_check CHECK (
    status IN ('pending', 'approved', 'skipped', 'created')
  )
);

CREATE UNIQUE INDEX IF NOT EXISTS search_console_rows_import_source_unique
  ON public.search_console_import_rows (import_id, source_path);
CREATE INDEX IF NOT EXISTS search_console_rows_status_idx
  ON public.search_console_import_rows (import_id, status);

-- Canonical forms of all eleven redirects previously configured in Next.js.
WITH seed(id, source_path, destination_path, match_type, status_code, description) AS (
  VALUES
    ('10000000-0000-4000-8000-000000000001'::uuid, '/blog', '/articles', 'exact', 308, 'Imported from next.config.ts'),
    ('10000000-0000-4000-8000-000000000002'::uuid, '/blog/:segment', '/articles/:segment', 'segment', 308, 'Imported from next.config.ts'),
    ('10000000-0000-4000-8000-000000000003'::uuid, '/news/:path*', '/articles', 'splat', 308, 'Imported from next.config.ts'),
    ('10000000-0000-4000-8000-000000000004'::uuid, '/services/brand-identity', '/services/business-documentation', 'exact', 308, 'Imported from next.config.ts'),
    ('10000000-0000-4000-8000-000000000005'::uuid, '/services/seo-services', '/services/seo', 'exact', 308, 'Imported from next.config.ts'),
    ('10000000-0000-4000-8000-000000000006'::uuid, '/services/mobile-development', '/services', 'exact', 307, 'Imported from next.config.ts'),
    ('10000000-0000-4000-8000-000000000007'::uuid, '/locations/brits', '/locations', 'exact', 308, 'Imported from next.config.ts'),
    ('10000000-0000-4000-8000-000000000008'::uuid, '/portfolio', '/success-stories', 'exact', 308, 'Imported from next.config.ts'),
    ('10000000-0000-4000-8000-000000000009'::uuid, '/portfolio/:segment', '/success-stories', 'segment', 308, 'Imported from next.config.ts'),
    ('10000000-0000-4000-8000-000000000010'::uuid, '/terms-conditions', '/terms-of-service', 'exact', 308, 'Imported from next.config.ts'),
    ('10000000-0000-4000-8000-000000000011'::uuid, '/terms-conditions/:segment', '/terms-of-service', 'segment', 308, 'Imported from next.config.ts')
)
INSERT INTO public.redirect_rules (
  id, source_path, destination_path, match_type, status_code,
  is_active, is_automatic, preserve_query, description, created_by
)
SELECT
  seed.id, seed.source_path, seed.destination_path, seed.match_type, seed.status_code,
  true, false, true, seed.description, 'system:migration'
FROM seed
WHERE NOT EXISTS (
  SELECT 1 FROM public.redirect_rules existing
  WHERE existing.source_path = seed.source_path AND existing.is_active = true
);

COMMIT;
