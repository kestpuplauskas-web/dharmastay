-- Remove the SECURITY DEFINER view; use column-level grants instead
DROP VIEW IF EXISTS public.booking_availability;

-- Restrict bookings column access: only car_id + dates exposed publicly; note stays admin-only
REVOKE SELECT ON public.bookings FROM anon, authenticated;
GRANT SELECT (car_id, date_from, date_to) ON public.bookings TO anon, authenticated;
GRANT SELECT ON public.bookings TO service_role;

-- Re-allow public SELECT row visibility; columns are filtered by the grants above
CREATE POLICY "Public can view booking dates"
ON public.bookings
FOR SELECT
TO anon, authenticated
USING (true);