CREATE TABLE public.booking_notifications (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  booking_id uuid NOT NULL REFERENCES public.bookings(id) ON DELETE CASCADE,
  kind text NOT NULL,
  recipient text NOT NULL DEFAULT '',
  status text NOT NULL DEFAULT 'sent',
  error text NOT NULL DEFAULT '',
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX booking_notifications_unique_kind ON public.booking_notifications (booking_id, kind);
CREATE INDEX booking_notifications_booking_idx ON public.booking_notifications (booking_id);

GRANT SELECT ON public.booking_notifications TO authenticated;
GRANT ALL ON public.booking_notifications TO service_role;

ALTER TABLE public.booking_notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view notification log"
ON public.booking_notifications
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));