DELETE FROM public.content_templates a
USING public.content_templates b
WHERE a.category = b.category
  AND a.template_name = b.template_name
  AND (a.updated_at < b.updated_at OR (a.updated_at = b.updated_at AND a.id < b.id));

DROP INDEX IF EXISTS public.idx_content_templates_property;
ALTER TABLE public.content_templates DROP CONSTRAINT IF EXISTS content_templates_property_id_category_template_name_key;
ALTER TABLE public.content_templates DROP COLUMN IF EXISTS property_id;
ALTER TABLE public.content_templates
  ADD CONSTRAINT content_templates_category_template_name_key UNIQUE (category, template_name);