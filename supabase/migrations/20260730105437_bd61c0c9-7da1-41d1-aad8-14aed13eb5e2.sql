ALTER TABLE public.bookings
  ADD COLUMN IF NOT EXISTS adults_count integer NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS children_count integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS infants_count integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS total_guests integer NOT NULL DEFAULT 1;

UPDATE public.bookings
SET adults_count = GREATEST(1, COALESCE(guests, 1)),
    total_guests = GREATEST(1, COALESCE(guests, 1))
WHERE total_guests = 1 AND COALESCE(guests, 1) <> 1;