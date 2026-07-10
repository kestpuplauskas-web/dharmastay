DROP POLICY IF EXISTS "Anyone can track" ON public.page_views;
CREATE POLICY "Anyone can track" ON public.page_views
FOR INSERT TO anon, authenticated
WITH CHECK (
  length(path) <= 2048
  AND length(session_id) BETWEEN 1 AND 128
  AND length(referrer) <= 2048
  AND length(country) <= 8
  AND length(user_agent) <= 1024
);