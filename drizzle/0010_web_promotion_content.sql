-- Apply manually ONLY to mogen-packages-dev, after 0009.
-- No campaign is inserted, activated or published by this migration.
-- The slug is the public URL key; presentation holds approved marketing copy.
BEGIN;

ALTER TABLE public.web_promotions
  ADD COLUMN IF NOT EXISTS slug text,
  ADD COLUMN IF NOT EXISTS is_featured boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS sort_order integer NOT NULL DEFAULT 100,
  ADD COLUMN IF NOT EXISTS presentation jsonb NOT NULL DEFAULT '{}'::jsonb;

CREATE UNIQUE INDEX IF NOT EXISTS web_promotions_slug_unique
  ON public.web_promotions(slug)
  WHERE slug IS NOT NULL;

DO $
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'web_promotions_slug_format_check'
      AND conrelid = 'public.web_promotions'::regclass
  ) THEN
    ALTER TABLE public.web_promotions
      ADD CONSTRAINT web_promotions_slug_format_check
      CHECK (slug IS NULL OR slug ~ '^[a-z0-9]+(-[a-z0-9]+)*

-- Existing campaigns, if any, remain unchanged and cannot appear publicly
-- without an approved slug and a valid target on a published payment option.
COMMIT;
);
  END IF;
END $;

-- Existing campaigns, if any, remain unchanged and cannot appear publicly
-- without an approved slug and a valid target on a published payment option.
COMMIT;
