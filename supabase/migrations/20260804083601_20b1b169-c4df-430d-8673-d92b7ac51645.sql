CREATE TABLE public.content_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id uuid NOT NULL REFERENCES public.properties(id) ON DELETE CASCADE,
  category text NOT NULL CHECK (category IN ('email','whatsapp','guest_info')),
  template_name text NOT NULL,
  subject text NOT NULL DEFAULT '',
  content text NOT NULL DEFAULT '',
  fields jsonb NOT NULL DEFAULT '{}'::jsonb,
  is_enabled boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by uuid,
  UNIQUE (property_id, category, template_name)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.content_templates TO authenticated;
GRANT ALL ON public.content_templates TO service_role;

ALTER TABLE public.content_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage content templates"
ON public.content_templates FOR ALL TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER content_templates_touch_updated_at
BEFORE UPDATE ON public.content_templates
FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

CREATE INDEX idx_content_templates_property ON public.content_templates(property_id, category);