ALTER TABLE public.properties
  ADD COLUMN dynamic_pricing_enabled boolean NOT NULL DEFAULT false,
  ADD COLUMN min_nightly_rate numeric(10,2) CHECK (min_nightly_rate IS NULL OR min_nightly_rate >= 0),
  ADD COLUMN max_nightly_rate numeric(10,2),
  ADD COLUMN occupancy_pricing jsonb NOT NULL DEFAULT '[]'::jsonb;

ALTER TABLE public.properties
  ADD CONSTRAINT properties_price_bounds_order
  CHECK (min_nightly_rate IS NULL OR max_nightly_rate IS NULL OR max_nightly_rate >= min_nightly_rate);

GRANT SELECT (dynamic_pricing_enabled, min_nightly_rate, max_nightly_rate, occupancy_pricing)
  ON public.properties TO anon, authenticated;
GRANT UPDATE (dynamic_pricing_enabled, min_nightly_rate, max_nightly_rate, occupancy_pricing)
  ON public.properties TO authenticated;

CREATE TABLE public.property_rate_calendar (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id uuid NOT NULL REFERENCES public.properties(id) ON DELETE CASCADE,
  date_from   date NOT NULL,
  date_to     date NOT NULL,
  kind        text NOT NULL CHECK (kind IN ('season', 'event', 'manual')),
  label       text NOT NULL,
  multiplier  numeric(6,3) CHECK (multiplier IS NULL OR multiplier > 0),
  fixed_price numeric(10,2) CHECK (fixed_price IS NULL OR fixed_price >= 0),
  priority    integer NOT NULL DEFAULT 0,
  created_by  uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT property_rate_calendar_range CHECK (date_to >= date_from),
  CONSTRAINT property_rate_calendar_one_value CHECK (
    (multiplier IS NOT NULL AND fixed_price IS NULL) OR
    (multiplier IS NULL AND fixed_price IS NOT NULL)
  )
);

CREATE INDEX property_rate_calendar_lookup_idx
  ON public.property_rate_calendar (property_id, date_from, date_to);

GRANT SELECT ON public.property_rate_calendar TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.property_rate_calendar TO authenticated;
GRANT ALL ON public.property_rate_calendar TO service_role;

ALTER TABLE public.property_rate_calendar ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read rate calendar" ON public.property_rate_calendar
  FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Admins manage rate calendar" ON public.property_rate_calendar
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER property_rate_calendar_set_updated_at
  BEFORE UPDATE ON public.property_rate_calendar
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();