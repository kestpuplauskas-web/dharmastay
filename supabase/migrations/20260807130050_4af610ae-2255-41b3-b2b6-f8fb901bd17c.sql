CREATE OR REPLACE FUNCTION public.create_room_status_for_property()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.room_status (property_id, status)
  VALUES (NEW.id, 'reikia_tvarkyti')
  ON CONFLICT (property_id) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS properties_create_room_status ON public.properties;
CREATE TRIGGER properties_create_room_status
  AFTER INSERT ON public.properties
  FOR EACH ROW EXECUTE FUNCTION public.create_room_status_for_property();

INSERT INTO public.room_status (property_id, status)
SELECT p.id, 'reikia_tvarkyti' FROM public.properties p
ON CONFLICT (property_id) DO NOTHING;

REVOKE ALL ON FUNCTION public.create_room_status_for_property() FROM anon, authenticated;