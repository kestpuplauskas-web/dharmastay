-- 1) Bookings: drop public SELECT, expose safe columns via view
DROP POLICY IF EXISTS "Anyone views bookings" ON public.bookings;

CREATE OR REPLACE VIEW public.booking_availability
WITH (security_invoker = false) AS
SELECT car_id, date_from, date_to
FROM public.bookings;

GRANT SELECT ON public.booking_availability TO anon, authenticated;

-- 2) user_roles: explicit restrictive policy blocking non-admin writes
CREATE POLICY "Only admins can modify roles"
ON public.user_roles
AS RESTRICTIVE
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::public.app_role))
WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));