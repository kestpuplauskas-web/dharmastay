ALTER TABLE public.bookings
  ADD COLUMN IF NOT EXISTS customer_address text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS pickup_location text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS return_location text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS customer_id_code text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS mileage_out integer,
  ADD COLUMN IF NOT EXISTS mileage_in integer;