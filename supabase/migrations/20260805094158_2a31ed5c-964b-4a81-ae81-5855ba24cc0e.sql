REVOKE SELECT ON public.properties FROM authenticated;
GRANT SELECT (id, name, category, year, price_per_night, cover_image_url, image_urls, features, price_tiers, is_active, sort_order, created_at, updated_at, status, property_type, description, address, city, country, lat, lng, area_m2, max_guests, beds, rooms, amenities, extra_services, ical_import_url, ical_last_sync_at, ical_last_status) ON public.properties TO authenticated;

CREATE OR REPLACE FUNCTION public.admin_get_door_code(_property_id uuid)
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT CASE WHEN public.has_role(auth.uid(), 'admin') THEN p.door_code END
  FROM public.properties p WHERE p.id = _property_id
$$;

REVOKE ALL ON FUNCTION public.admin_get_door_code(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_get_door_code(uuid) TO authenticated;