CREATE OR REPLACE FUNCTION public.recalc_car_mileage(_car_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  latest int;
BEGIN
  SELECT MAX(GREATEST(COALESCE(mileage_in,0), COALESCE(mileage_out,0)))
    INTO latest
    FROM public.bookings
    WHERE car_id = _car_id
      AND status <> 'cancelled'
      AND (mileage_in IS NOT NULL OR mileage_out IS NOT NULL);
  IF latest IS NOT NULL AND latest > 0 THEN
    UPDATE public.cars SET current_mileage = latest WHERE id = _car_id;
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION public.bump_car_mileage_from_booking()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    PERFORM public.recalc_car_mileage(OLD.car_id);
    RETURN OLD;
  ELSE
    PERFORM public.recalc_car_mileage(NEW.car_id);
    RETURN NEW;
  END IF;
END;
$$;

DROP TRIGGER IF EXISTS trg_bump_car_mileage ON public.bookings;
CREATE TRIGGER trg_bump_car_mileage
AFTER INSERT OR UPDATE OF mileage_in, mileage_out, status OR DELETE
ON public.bookings
FOR EACH ROW EXECUTE FUNCTION public.bump_car_mileage_from_booking();

-- Backfill all cars
DO $$
DECLARE r record;
BEGIN
  FOR r IN SELECT id FROM public.cars LOOP
    PERFORM public.recalc_car_mileage(r.id);
  END LOOP;
END $$;