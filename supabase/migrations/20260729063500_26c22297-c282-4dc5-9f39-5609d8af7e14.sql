
REVOKE EXECUTE ON FUNCTION public.set_booking_number() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.ensure_single_active_template() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.cancel_expired_pending_bookings() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) FROM PUBLIC, anon;
