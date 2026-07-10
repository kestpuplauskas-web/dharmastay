
ALTER TABLE public.contract_templates
  ADD COLUMN IF NOT EXISTS kind text NOT NULL DEFAULT 'rental';

ALTER TABLE public.contract_templates
  DROP CONSTRAINT IF EXISTS contract_templates_kind_check;

ALTER TABLE public.contract_templates
  ADD CONSTRAINT contract_templates_kind_check CHECK (kind IN ('rental', 'privacy'));

UPDATE public.contract_templates
   SET kind = 'privacy'
 WHERE lower(name) LIKE '%privatum%' OR lower(name) LIKE '%privacy%';

CREATE OR REPLACE FUNCTION public.ensure_single_active_template()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF NEW.is_active THEN
    UPDATE public.contract_templates
       SET is_active = false
     WHERE language = NEW.language
       AND kind = NEW.kind
       AND id <> NEW.id
       AND is_active = true;
  END IF;
  RETURN NEW;
END;
$function$;
