-- 1) inquiries: replace tautological WITH CHECK (true) with real field validation
DROP POLICY IF EXISTS "Anyone can submit an inquiry" ON public.inquiries;
CREATE POLICY "Anyone can submit an inquiry"
ON public.inquiries
FOR INSERT
TO anon, authenticated
WITH CHECK (
  length(trim(name)) BETWEEN 1 AND 200
  AND length(trim(email)) BETWEEN 3 AND 320
  AND email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$'
  AND length(trim(message)) BETWEEN 5 AND 5000
  AND (phone IS NULL OR length(phone) <= 40)
  AND lang IN ('lt', 'en')
  AND read_at IS NULL
  AND archived_at IS NULL
);

-- 2) property_rate_calendar: remove public read; admins keep full access via existing policy
DROP POLICY IF EXISTS "Anyone can read rate calendar" ON public.property_rate_calendar;