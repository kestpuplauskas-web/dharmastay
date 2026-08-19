ALTER TABLE public.room_status DROP CONSTRAINT IF EXISTS room_status_status_check;

ALTER TABLE public.room_status
  ADD COLUMN IF NOT EXISTS has_issue boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS issue_note text NOT NULL DEFAULT '';

UPDATE public.room_status
SET has_issue = true, status = 'nesvarus'
WHERE status = 'problema';

UPDATE public.room_status SET status = 'nesvarus' WHERE status = 'reikia_tvarkyti';
UPDATE public.room_status SET status = 'svarus'   WHERE status = 'svaru';

ALTER TABLE public.room_status ALTER COLUMN status SET DEFAULT 'nesvarus';

ALTER TABLE public.room_status
  ADD CONSTRAINT room_status_status_check
  CHECK (status IN ('nesvarus', 'tvarkoma', 'svarus'));

CREATE OR REPLACE FUNCTION public.create_room_status_for_property()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.room_status (property_id, status)
  VALUES (NEW.id, 'nesvarus')
  ON CONFLICT (property_id) DO NOTHING;
  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.create_room_status_for_property() FROM PUBLIC, anon, authenticated;

CREATE TABLE public.housekeeping_tasks (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id  uuid NOT NULL REFERENCES public.properties(id) ON DELETE CASCADE,
  service_date date NOT NULL,
  status       text NOT NULL DEFAULT 'laukia'
    CHECK (status IN ('laukia', 'vykdoma', 'atlikta')),
  assigned_to  uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  assigned_at  timestamptz,
  updated_by   uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  updated_at   timestamptz NOT NULL DEFAULT now(),
  created_at   timestamptz NOT NULL DEFAULT now(),
  UNIQUE (property_id, service_date)
);

CREATE INDEX housekeeping_tasks_date_idx ON public.housekeeping_tasks (service_date);

CREATE TRIGGER housekeeping_tasks_touch_updated_at
  BEFORE UPDATE ON public.housekeeping_tasks
  FOR EACH ROW EXECUTE FUNCTION public.touch_room_status_updated_at();

CREATE TABLE public.housekeeping_comments (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id  uuid NOT NULL REFERENCES public.properties(id) ON DELETE CASCADE,
  service_date date NOT NULL,
  author_id    uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  author_role  text NOT NULL CHECK (author_role IN ('admin', 'housekeeper')),
  body         text NOT NULL,
  created_at   timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX housekeeping_comments_lookup_idx
  ON public.housekeeping_comments (property_id, service_date, created_at);

REVOKE ALL ON public.housekeeping_tasks    FROM anon, authenticated;
REVOKE ALL ON public.housekeeping_comments FROM anon, authenticated;
GRANT ALL ON public.housekeeping_tasks    TO service_role;
GRANT ALL ON public.housekeeping_comments TO service_role;
GRANT SELECT, INSERT, UPDATE ON public.housekeeping_tasks    TO authenticated;
GRANT SELECT, INSERT          ON public.housekeeping_comments TO authenticated;

ALTER TABLE public.housekeeping_tasks    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.housekeeping_comments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage housekeeping_tasks"
ON public.housekeeping_tasks FOR ALL TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins manage housekeeping_comments"
ON public.housekeeping_comments FOR ALL TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

ALTER TABLE public.property_settings
  ADD COLUMN IF NOT EXISTS stayover_clean_every_days integer NOT NULL DEFAULT 3;