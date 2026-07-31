REVOKE EXECUTE ON FUNCTION public.get_active_booked_dates() FROM anon;
REVOKE EXECUTE ON FUNCTION public.get_property_booked_dates(uuid) FROM anon;

DROP POLICY IF EXISTS "Public read property images" ON storage.objects;
CREATE POLICY "Public read property images"
ON storage.objects FOR SELECT
TO anon, authenticated
USING (bucket_id IN ('car-images', 'property-images'));