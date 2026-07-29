ALTER TABLE public.properties ADD COLUMN IF NOT EXISTS extra_services jsonb NOT NULL DEFAULT '[]'::jsonb;
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS extras jsonb NOT NULL DEFAULT '[]'::jsonb;
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS extras_total numeric NOT NULL DEFAULT 0;