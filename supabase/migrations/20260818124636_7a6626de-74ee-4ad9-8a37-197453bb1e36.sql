-- 1) Remove duplicate legacy policies
DROP POLICY IF EXISTS "Anyone views active cars" ON public.properties;
DROP POLICY IF EXISTS "Admins view all cars" ON public.properties;

-- 2) Column-level grants: exclude door_code from SELECT for anon/authenticated
REVOKE SELECT ON public.properties FROM anon, authenticated;

DO $$
DECLARE cols text;
BEGIN
  SELECT string_agg(quote_ident(column_name), ', ')
    INTO cols
  FROM information_schema.columns
  WHERE table_schema = 'public' AND table_name = 'properties' AND column_name <> 'door_code';

  EXECUTE format('GRANT SELECT (%s) ON public.properties TO anon, authenticated', cols);
END $$;

GRANT INSERT, UPDATE, DELETE ON public.properties TO authenticated;
GRANT ALL ON public.properties TO service_role;

-- 3) Revoke public EXECUTE on SECURITY DEFINER trigger function
REVOKE ALL ON FUNCTION public.create_room_status_for_property() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.create_room_status_for_property() TO service_role;