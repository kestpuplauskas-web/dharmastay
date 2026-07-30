REVOKE ALL ON public.bookings FROM anon;
REVOKE ALL ON public.payment_transactions FROM anon, authenticated;
REVOKE ALL ON public.property_documents FROM anon;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.bookings TO authenticated;
GRANT ALL ON public.bookings TO service_role;
GRANT SELECT ON public.payment_transactions TO authenticated;
GRANT ALL ON public.payment_transactions TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.property_documents TO authenticated;
GRANT ALL ON public.property_documents TO service_role;

CREATE OR REPLACE FUNCTION public.get_property_booked_dates(_property_id uuid)
RETURNS TABLE(date_from date, date_to date, status text)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT date_from, date_to, status
  FROM public.bookings
  WHERE property_id = _property_id AND status <> 'cancelled'
$$;

CREATE OR REPLACE FUNCTION public.get_active_booked_dates()
RETURNS TABLE(property_id uuid, date_from date, date_to date)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT b.property_id, b.date_from, b.date_to
  FROM public.bookings b
  JOIN public.properties p ON p.id = b.property_id AND p.is_active
  WHERE b.status <> 'cancelled' AND b.date_to >= CURRENT_DATE
$$;

REVOKE ALL ON FUNCTION public.get_property_booked_dates(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.get_active_booked_dates() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_property_booked_dates(uuid) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.get_active_booked_dates() TO anon, authenticated, service_role;