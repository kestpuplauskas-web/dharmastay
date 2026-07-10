GRANT SELECT ON public.contract_templates TO anon;
CREATE POLICY "Anon can read active templates"
  ON public.contract_templates
  FOR SELECT
  TO anon
  USING (is_active = true);