CREATE TABLE public.api_clients (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  key_hash text NOT NULL UNIQUE,
  key_prefix text NOT NULL DEFAULT '',
  allowed_origins text[] NOT NULL DEFAULT '{}',
  is_active boolean NOT NULL DEFAULT true,
  last_used_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT ALL ON public.api_clients TO service_role;
ALTER TABLE public.api_clients ENABLE ROW LEVEL SECURITY;
CREATE POLICY "api_clients service only" ON public.api_clients FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE TABLE public.api_request_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  api_client_id uuid REFERENCES public.api_clients(id) ON DELETE CASCADE,
  path text NOT NULL,
  ip text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT ALL ON public.api_request_log TO service_role;
ALTER TABLE public.api_request_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "api_request_log service only" ON public.api_request_log FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE INDEX idx_api_request_log_client_time ON public.api_request_log (api_client_id, created_at DESC);
CREATE INDEX idx_api_request_log_ip_time ON public.api_request_log (ip, created_at DESC);

CREATE OR REPLACE FUNCTION public.set_api_clients_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.set_api_clients_updated_at() FROM PUBLIC, anon, authenticated;

CREATE TRIGGER update_api_clients_updated_at
BEFORE UPDATE ON public.api_clients
FOR EACH ROW EXECUTE FUNCTION public.set_api_clients_updated_at();