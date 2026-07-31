CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA extensions;
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;

CREATE TABLE IF NOT EXISTS public.app_secrets (
  key text PRIMARY KEY,
  value text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

REVOKE ALL ON public.app_secrets FROM anon, authenticated;
GRANT ALL ON public.app_secrets TO service_role;
ALTER TABLE public.app_secrets ENABLE ROW LEVEL SECURITY;

INSERT INTO public.app_secrets (key, value)
VALUES ('ical_sync_token', encode(gen_random_bytes(32), 'hex'))
ON CONFLICT (key) DO NOTHING;

DO $$
DECLARE
  tok text;
BEGIN
  SELECT value INTO tok FROM public.app_secrets WHERE key = 'ical_sync_token';

  PERFORM cron.unschedule('ical-sync-every-15-min')
  WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'ical-sync-every-15-min');

  PERFORM cron.schedule(
    'ical-sync-every-15-min',
    '*/15 * * * *',
    format(
      $cmd$select net.http_post(
        url := 'https://project--3b144e50-7336-4c5e-a93d-7aeca70328ba.lovable.app/api/public/ical-sync',
        headers := jsonb_build_object('Content-Type','application/json','x-ical-sync-secret',%L),
        body := '{}'::jsonb
      );$cmd$, tok)
  );
END $$;