ALTER TABLE public.expenses ADD COLUMN IF NOT EXISTS mileage_km integer;
ALTER TABLE public.car_investments ADD COLUMN IF NOT EXISTS mileage_km integer;
ALTER TABLE public.car_maintenance ADD COLUMN IF NOT EXISTS due_mileage_km integer;