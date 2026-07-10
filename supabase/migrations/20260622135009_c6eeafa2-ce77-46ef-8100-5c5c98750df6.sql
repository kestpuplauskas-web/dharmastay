-- Lock down get_car_booked_dates: switch to SECURITY INVOKER and remove anon EXECUTE.
-- It will be called server-side with the service role, so anon no longer needs access.
ALTER FUNCTION public.get_car_booked_dates(uuid) SECURITY INVOKER;
REVOKE EXECUTE ON FUNCTION public.get_car_booked_dates(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_car_booked_dates(uuid) TO service_role;