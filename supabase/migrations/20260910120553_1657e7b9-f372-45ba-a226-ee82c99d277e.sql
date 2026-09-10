-- 1) Column-level protection for public.properties
REVOKE SELECT ON public.properties FROM anon;
REVOKE SELECT ON public.properties FROM authenticated;

GRANT SELECT (
  id, name, category, year, price_per_night, cover_image_url, image_urls,
  features, price_tiers, is_active, sort_order, created_at, updated_at, status,
  property_type, description, address, city, country, lat, lng, area_m2,
  max_guests, beds, rooms, amenities, extra_services
) ON public.properties TO anon;

GRANT SELECT (
  id, name, category, year, price_per_night, cover_image_url, image_urls,
  features, price_tiers, is_active, sort_order, created_at, updated_at, status,
  property_type, description, address, city, country, lat, lng, area_m2,
  max_guests, beds, rooms, amenities, extra_services,
  location_note, ical_import_url, ical_last_sync_at, ical_last_status
) ON public.properties TO authenticated;

GRANT ALL ON public.properties TO service_role;

-- 2) Bookings: no anonymous access at all
REVOKE ALL ON public.bookings FROM anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.bookings TO authenticated;
GRANT ALL ON public.bookings TO service_role;

-- 3) Storage: scope public image reads to the intended bucket/prefix
DROP POLICY IF EXISTS "Public read property images" ON storage.objects;
CREATE POLICY "Public read property images"
ON storage.objects
FOR SELECT
TO anon, authenticated
USING (
  bucket_id = 'car-images'
  AND (storage.foldername(name))[1] = 'properties'
);