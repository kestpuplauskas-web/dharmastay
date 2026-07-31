ALTER TABLE public.properties
  ADD COLUMN IF NOT EXISTS ical_import_url text,
  ADD COLUMN IF NOT EXISTS ical_last_sync_at timestamptz,
  ADD COLUMN IF NOT EXISTS ical_last_status text;

ALTER TABLE public.bookings
  ADD COLUMN IF NOT EXISTS external_uid text,
  ADD COLUMN IF NOT EXISTS external_source text;

CREATE UNIQUE INDEX IF NOT EXISTS bookings_property_external_uid_key
  ON public.bookings (property_id, external_uid)
  WHERE external_uid IS NOT NULL;