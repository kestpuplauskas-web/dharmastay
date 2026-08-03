ALTER TABLE public.property_settings ADD COLUMN IF NOT EXISTS scope text NOT NULL DEFAULT 'global';
ALTER TABLE public.property_settings ALTER COLUMN property_id DROP NOT NULL;
ALTER TABLE public.property_settings DROP CONSTRAINT IF EXISTS property_settings_property_id_key;

-- keep only the most recently updated row, promote it to the global record
DELETE FROM public.property_settings ps
WHERE ps.id <> (
  SELECT id FROM public.property_settings ORDER BY updated_at DESC NULLS LAST, created_at DESC LIMIT 1
);

UPDATE public.property_settings SET property_id = NULL, scope = 'global';

ALTER TABLE public.property_settings ADD CONSTRAINT property_settings_scope_check CHECK (scope = 'global');
CREATE UNIQUE INDEX IF NOT EXISTS property_settings_scope_key ON public.property_settings (scope);