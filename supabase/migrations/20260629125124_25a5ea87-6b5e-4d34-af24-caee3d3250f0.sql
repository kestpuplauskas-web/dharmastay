
ALTER TABLE public.cars
  ADD COLUMN IF NOT EXISTS current_mileage integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS service_status text NOT NULL DEFAULT 'active';

ALTER TABLE public.cars
  DROP CONSTRAINT IF EXISTS cars_service_status_check;
ALTER TABLE public.cars
  ADD CONSTRAINT cars_service_status_check
  CHECK (service_status IN ('active','in_service'));

CREATE OR REPLACE FUNCTION public.bump_car_mileage_from_booking()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_mileage int;
BEGIN
  new_mileage := GREATEST(COALESCE(NEW.mileage_in, 0), COALESCE(NEW.mileage_out, 0));
  IF new_mileage > 0 THEN
    UPDATE public.cars
       SET current_mileage = new_mileage
     WHERE id = NEW.car_id
       AND new_mileage > current_mileage;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_bump_car_mileage ON public.bookings;
CREATE TRIGGER trg_bump_car_mileage
AFTER INSERT OR UPDATE OF mileage_in, mileage_out ON public.bookings
FOR EACH ROW EXECUTE FUNCTION public.bump_car_mileage_from_booking();

UPDATE public.cars c
   SET current_mileage = sub.mx
  FROM (
    SELECT car_id, MAX(GREATEST(COALESCE(mileage_in,0), COALESCE(mileage_out,0))) AS mx
      FROM public.bookings
     GROUP BY car_id
  ) sub
 WHERE sub.car_id = c.id
   AND sub.mx > c.current_mileage;

CREATE TABLE IF NOT EXISTS public.car_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  car_id uuid NOT NULL REFERENCES public.cars(id) ON DELETE CASCADE,
  kind text NOT NULL CHECK (kind IN ('registration','insurance','inspection','purchase','other')),
  title text NOT NULL DEFAULT '',
  file_path text NOT NULL,
  mime_type text NOT NULL DEFAULT 'application/pdf',
  size_bytes integer NOT NULL DEFAULT 0,
  expires_at date,
  uploaded_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.car_documents TO authenticated;
GRANT ALL ON public.car_documents TO service_role;

ALTER TABLE public.car_documents ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins manage car documents" ON public.car_documents;
CREATE POLICY "Admins manage car documents"
ON public.car_documents
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

DROP TRIGGER IF EXISTS trg_car_documents_updated_at ON public.car_documents;
CREATE TRIGGER trg_car_documents_updated_at
BEFORE UPDATE ON public.car_documents
FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

CREATE INDEX IF NOT EXISTS idx_car_documents_car ON public.car_documents(car_id);

CREATE TABLE IF NOT EXISTS public.car_service_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  car_id uuid NOT NULL REFERENCES public.cars(id) ON DELETE CASCADE,
  started_at timestamptz NOT NULL DEFAULT now(),
  ended_at timestamptz,
  reason text NOT NULL DEFAULT '',
  cost numeric(12,2),
  mileage_km integer,
  note text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.car_service_events TO authenticated;
GRANT ALL ON public.car_service_events TO service_role;

ALTER TABLE public.car_service_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins manage service events" ON public.car_service_events;
CREATE POLICY "Admins manage service events"
ON public.car_service_events
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

DROP TRIGGER IF EXISTS trg_car_service_events_updated_at ON public.car_service_events;
CREATE TRIGGER trg_car_service_events_updated_at
BEFORE UPDATE ON public.car_service_events
FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

CREATE INDEX IF NOT EXISTS idx_car_service_events_car ON public.car_service_events(car_id);
