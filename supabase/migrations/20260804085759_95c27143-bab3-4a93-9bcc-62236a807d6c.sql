-- 1) Hide door_code (physical access credential) from anonymous/public API reads
REVOKE SELECT ON public.properties FROM anon;
GRANT SELECT (
  id, name, category, year, price_per_night, cover_image_url, image_urls, features,
  price_tiers, is_active, sort_order, created_at, updated_at, status, property_type,
  description, address, city, country, lat, lng, area_m2, max_guests, beds, rooms,
  amenities, extra_services, ical_import_url, ical_last_sync_at, ical_last_status
) ON public.properties TO anon;

-- 2) Restrict property_settings (IBAN, company/VAT, operational data) to admins only
DROP POLICY IF EXISTS "Authenticated can view property settings" ON public.property_settings;
CREATE POLICY "Admins can view property settings"
ON public.property_settings
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));