DROP POLICY IF EXISTS "Anon can read active templates" ON public.contract_templates;
REVOKE SELECT ON public.contract_templates FROM anon;