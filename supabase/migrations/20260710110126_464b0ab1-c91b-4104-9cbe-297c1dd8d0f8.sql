
DROP FUNCTION IF EXISTS public.bump_car_mileage_from_booking() CASCADE;
DROP FUNCTION IF EXISTS public.recalc_car_mileage(uuid) CASCADE;
DROP FUNCTION IF EXISTS public.get_car_booked_dates(uuid) CASCADE;

ALTER TABLE public.cars RENAME TO properties;
ALTER TABLE public.properties RENAME CONSTRAINT cars_pkey TO properties_pkey;
ALTER INDEX IF EXISTS cars_sort_idx RENAME TO properties_sort_idx;
ALTER TABLE public.properties DROP CONSTRAINT IF EXISTS cars_service_status_check;

ALTER TABLE public.properties
  DROP COLUMN IF EXISTS transmission,
  DROP COLUMN IF EXISTS seats,
  DROP COLUMN IF EXISTS fuel,
  DROP COLUMN IF EXISTS consumption,
  DROP COLUMN IF EXISTS mileage_policy,
  DROP COLUMN IF EXISTS current_mileage;

ALTER TABLE public.properties RENAME COLUMN service_status TO status;
ALTER TABLE public.properties ALTER COLUMN status SET DEFAULT 'active';
ALTER TABLE public.properties ADD CONSTRAINT properties_status_check
  CHECK (status IN ('active','maintenance','blocked'));

ALTER TABLE public.properties RENAME COLUMN price_per_day TO price_per_night;

ALTER TABLE public.properties
  ADD COLUMN IF NOT EXISTS property_type text NOT NULL DEFAULT 'apartment',
  ADD COLUMN IF NOT EXISTS description text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS address text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS city text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS country text NOT NULL DEFAULT 'LT',
  ADD COLUMN IF NOT EXISTS lat numeric(9,6),
  ADD COLUMN IF NOT EXISTS lng numeric(9,6),
  ADD COLUMN IF NOT EXISTS area_m2 integer,
  ADD COLUMN IF NOT EXISTS max_guests integer NOT NULL DEFAULT 2,
  ADD COLUMN IF NOT EXISTS beds integer NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS rooms jsonb NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS amenities jsonb NOT NULL DEFAULT '[]'::jsonb;

DROP POLICY IF EXISTS "Admins manage cars" ON public.properties;
CREATE POLICY "Admins manage properties" ON public.properties
  FOR ALL TO authenticated
  USING (has_role(auth.uid(),'admin'::app_role))
  WITH CHECK (has_role(auth.uid(),'admin'::app_role));

CREATE POLICY "Anyone can view active properties" ON public.properties
  FOR SELECT TO anon, authenticated USING (is_active = true);

GRANT SELECT ON public.properties TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.properties TO authenticated;
GRANT ALL ON public.properties TO service_role;

ALTER TABLE public.bookings RENAME COLUMN car_id TO property_id;
ALTER TABLE public.bookings RENAME CONSTRAINT bookings_car_id_fkey TO bookings_property_id_fkey;
ALTER INDEX IF EXISTS bookings_car_idx RENAME TO bookings_property_idx;
ALTER TABLE public.bookings
  DROP COLUMN IF EXISTS mileage_out,
  DROP COLUMN IF EXISTS mileage_in;
ALTER TABLE public.bookings RENAME COLUMN pickup_time TO check_in_time;
ALTER TABLE public.bookings RENAME COLUMN return_time TO check_out_time;
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS location text NOT NULL DEFAULT '';
UPDATE public.bookings SET location = COALESCE(NULLIF(pickup_location,''), return_location, '')
  WHERE location = '';
ALTER TABLE public.bookings
  DROP COLUMN IF EXISTS pickup_location,
  DROP COLUMN IF EXISTS return_location;
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS guests integer NOT NULL DEFAULT 1;

ALTER TABLE public.car_documents RENAME TO property_documents;
ALTER TABLE public.property_documents RENAME COLUMN car_id TO property_id;
ALTER TABLE public.property_documents RENAME CONSTRAINT car_documents_car_id_fkey TO property_documents_property_id_fkey;

ALTER TABLE public.car_investments RENAME TO property_investments;
ALTER TABLE public.property_investments RENAME COLUMN car_id TO property_id;
ALTER TABLE public.property_investments RENAME CONSTRAINT car_investments_car_id_fkey TO property_investments_property_id_fkey;

ALTER TABLE public.car_maintenance RENAME TO property_maintenance;
ALTER TABLE public.property_maintenance RENAME COLUMN car_id TO property_id;
ALTER TABLE public.property_maintenance RENAME CONSTRAINT car_maintenance_car_id_fkey TO property_maintenance_property_id_fkey;

ALTER TABLE public.car_service_events RENAME TO property_events;
ALTER TABLE public.property_events RENAME COLUMN car_id TO property_id;
ALTER TABLE public.property_events RENAME CONSTRAINT car_service_events_car_id_fkey TO property_events_property_id_fkey;

ALTER TABLE public.expenses RENAME COLUMN car_id TO property_id;
ALTER TABLE public.expenses RENAME CONSTRAINT expenses_car_id_fkey TO expenses_property_id_fkey;

CREATE OR REPLACE FUNCTION public.get_property_booked_dates(_property_id uuid)
RETURNS TABLE(date_from date, date_to date, status text)
LANGUAGE sql STABLE SET search_path TO 'public'
AS $$
  SELECT date_from, date_to, status
  FROM public.bookings
  WHERE property_id = _property_id AND status <> 'cancelled'
$$;
