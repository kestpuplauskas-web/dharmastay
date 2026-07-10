
-- contract_templates
CREATE TABLE public.contract_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  language text NOT NULL CHECK (language IN ('lt','en')),
  content text NOT NULL DEFAULT '',
  is_active boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.contract_templates TO authenticated;
GRANT ALL ON public.contract_templates TO service_role;

ALTER TABLE public.contract_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage contract templates"
  ON public.contract_templates FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(),'admin'))
  WITH CHECK (public.has_role(auth.uid(),'admin'));

CREATE TRIGGER contract_templates_touch
  BEFORE UPDATE ON public.contract_templates
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- Ensure only one active template per language
CREATE OR REPLACE FUNCTION public.ensure_single_active_template()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.is_active THEN
    UPDATE public.contract_templates
       SET is_active = false
     WHERE language = NEW.language
       AND id <> NEW.id
       AND is_active = true;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER contract_templates_single_active
  BEFORE INSERT OR UPDATE OF is_active, language ON public.contract_templates
  FOR EACH ROW EXECUTE FUNCTION public.ensure_single_active_template();

-- signed_contracts
CREATE TABLE public.signed_contracts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id uuid NOT NULL REFERENCES public.bookings(id) ON DELETE CASCADE,
  template_id uuid REFERENCES public.contract_templates(id) ON DELETE SET NULL,
  contract_content text NOT NULL,
  customer_name text NOT NULL,
  customer_email text NOT NULL DEFAULT '',
  signed_at timestamptz NOT NULL DEFAULT now(),
  signature_text text NOT NULL,
  pdf_url text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX signed_contracts_booking_id_idx ON public.signed_contracts(booking_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.signed_contracts TO authenticated;
GRANT ALL ON public.signed_contracts TO service_role;

ALTER TABLE public.signed_contracts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage signed contracts"
  ON public.signed_contracts FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(),'admin'))
  WITH CHECK (public.has_role(auth.uid(),'admin'));
