REVOKE EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO authenticated, service_role;

REVOKE EXECUTE ON FUNCTION public.get_car_booked_dates(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_car_booked_dates(uuid) TO anon, authenticated, service_role;