-- Add new columns to bookings
ALTER TABLE public.bookings
  ADD COLUMN IF NOT EXISTS customer_name text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS customer_phone text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS customer_email text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS source text NOT NULL DEFAULT 'manual',
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'confirmed',
  ADD COLUMN IF NOT EXISTS total_amount numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS pickup_time text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS return_time text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();

-- updated_at trigger
DROP TRIGGER IF EXISTS bookings_touch_updated_at ON public.bookings;
CREATE TRIGGER bookings_touch_updated_at
  BEFORE UPDATE ON public.bookings
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- Lock down public read: drop the "view-all" policy that leaked customer PII
DROP POLICY IF EXISTS "Public can view booking dates" ON public.bookings;

-- Security definer function exposing ONLY safe date ranges for conflict checks
CREATE OR REPLACE FUNCTION public.get_car_booked_dates(_car_id uuid)
RETURNS TABLE(date_from date, date_to date, status text)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT date_from, date_to, status
  FROM public.bookings
  WHERE car_id = _car_id
    AND status <> 'cancelled'
$$;

GRANT EXECUTE ON FUNCTION public.get_car_booked_dates(uuid) TO anon, authenticated;

-- Ensure grants are correct on table (admins via RLS only)
REVOKE SELECT ON public.bookings FROM anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.bookings TO authenticated;
GRANT ALL ON public.bookings TO service_role;