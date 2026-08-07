CREATE TABLE public.room_status (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id uuid NOT NULL UNIQUE REFERENCES public.properties(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'reikia_tvarkyti'
    CHECK (status IN ('svaru', 'reikia_tvarkyti', 'tvarkoma', 'problema')),
  note text NOT NULL DEFAULT '',
  assigned_to uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  assigned_at timestamptz,
  updated_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE OR REPLACE FUNCTION public.touch_room_status_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER room_status_touch_updated_at
  BEFORE UPDATE ON public.room_status
  FOR EACH ROW EXECUTE FUNCTION public.touch_room_status_updated_at();

INSERT INTO public.room_status (property_id, status)
SELECT id, 'reikia_tvarkyti' FROM public.properties WHERE is_active = true
ON CONFLICT (property_id) DO NOTHING;

REVOKE ALL ON public.room_status FROM anon, authenticated;
GRANT ALL ON public.room_status TO service_role;
GRANT SELECT, INSERT, UPDATE ON public.room_status TO authenticated;

ALTER TABLE public.room_status ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage room_status"
ON public.room_status FOR ALL TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));