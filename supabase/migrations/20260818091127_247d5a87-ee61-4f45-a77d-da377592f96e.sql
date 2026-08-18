CREATE TABLE public.content_translations (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type text NOT NULL,
  entity_id   uuid NOT NULL,
  field       text NOT NULL,
  lang        text NOT NULL,
  value       text NOT NULL DEFAULT '',
  updated_at  timestamptz NOT NULL DEFAULT now(),
  updated_by  uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  UNIQUE (entity_type, entity_id, field, lang)
);

CREATE INDEX content_translations_lookup_idx
  ON public.content_translations (entity_type, entity_id, lang);

CREATE OR REPLACE FUNCTION public.touch_content_translations_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER content_translations_touch_updated_at
  BEFORE UPDATE ON public.content_translations
  FOR EACH ROW EXECUTE FUNCTION public.touch_content_translations_updated_at();

REVOKE ALL ON public.content_translations FROM anon, authenticated;
GRANT ALL ON public.content_translations TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.content_translations TO authenticated;

ALTER TABLE public.content_translations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage content_translations"
ON public.content_translations FOR ALL TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));