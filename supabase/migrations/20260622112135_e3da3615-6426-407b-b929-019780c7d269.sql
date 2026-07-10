
-- Add booking_number column with per-year auto-generation
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS booking_number text;

-- Backfill existing rows ordered by created_at, grouped by year of created_at
WITH numbered AS (
  SELECT id,
         to_char(created_at, 'YY') AS yy,
         ROW_NUMBER() OVER (PARTITION BY to_char(created_at, 'YY') ORDER BY created_at, id) AS seq
  FROM public.bookings
  WHERE booking_number IS NULL OR booking_number = ''
)
UPDATE public.bookings b
SET booking_number = 'R-' || n.yy || LPAD(n.seq::text, 3, '0')
FROM numbered n
WHERE b.id = n.id;

-- Enforce uniqueness
CREATE UNIQUE INDEX IF NOT EXISTS bookings_booking_number_key ON public.bookings(booking_number);

-- Trigger function: assign R-YYNNN on insert if not provided
CREATE OR REPLACE FUNCTION public.set_booking_number()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  yy text := to_char(now(), 'YY');
  next_seq int;
  candidate text;
BEGIN
  IF NEW.booking_number IS NOT NULL AND NEW.booking_number <> '' THEN
    RETURN NEW;
  END IF;

  LOOP
    SELECT COALESCE(MAX(CAST(SUBSTRING(booking_number FROM 5) AS INTEGER)), 0) + 1
      INTO next_seq
      FROM public.bookings
      WHERE booking_number LIKE 'R-' || yy || '%'
        AND SUBSTRING(booking_number FROM 5) ~ '^[0-9]+$';

    IF next_seq < 1 THEN next_seq := 1; END IF;
    candidate := 'R-' || yy || LPAD(next_seq::text, 3, '0');

    BEGIN
      NEW.booking_number := candidate;
      RETURN NEW;
    EXCEPTION WHEN unique_violation THEN
      -- retry
    END;
  END LOOP;
END;
$$;

DROP TRIGGER IF EXISTS trg_set_booking_number ON public.bookings;
CREATE TRIGGER trg_set_booking_number
BEFORE INSERT ON public.bookings
FOR EACH ROW
EXECUTE FUNCTION public.set_booking_number();

-- Make column NOT NULL after backfill
ALTER TABLE public.bookings ALTER COLUMN booking_number SET NOT NULL;

-- Restrict EXECUTE on the new SECURITY DEFINER function (trigger runs as definer regardless)
REVOKE EXECUTE ON FUNCTION public.set_booking_number() FROM PUBLIC, anon, authenticated;
