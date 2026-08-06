ALTER TABLE public.properties ADD COLUMN IF NOT EXISTS location_note text NOT NULL DEFAULT '';
GRANT SELECT (location_note) ON public.properties TO authenticated;