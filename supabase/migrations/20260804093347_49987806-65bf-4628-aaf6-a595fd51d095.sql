DO $$
DECLARE
  tok text;
BEGIN
  SELECT value INTO tok FROM public.app_secrets WHERE key = 'ical_sync_token';

  PERFORM cron.unschedule('notifications-hourly')
  WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'notifications-hourly');

  PERFORM cron.schedule(
    'notifications-hourly',
    '5 * * * *',
    format(
      $cmd$select net.http_post(
        url := 'https://project--3b144e50-7336-4c5e-a93d-7aeca70328ba.lovable.app/api/public/notifications-cron',
        headers := jsonb_build_object('Content-Type','application/json','x-ical-sync-secret',%L),
        body := '{}'::jsonb
      );$cmd$, tok)
  );
END $$;