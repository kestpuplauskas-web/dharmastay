
-- 1) Add payment columns to bookings
ALTER TABLE public.bookings
  ADD COLUMN IF NOT EXISTS payment_option text NOT NULL DEFAULT 'none',
  ADD COLUMN IF NOT EXISTS payment_status text NOT NULL DEFAULT 'unpaid',
  ADD COLUMN IF NOT EXISTS payment_amount numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS payment_reference text,
  ADD COLUMN IF NOT EXISTS payment_provider text,
  ADD COLUMN IF NOT EXISTS payment_paid_at timestamptz,
  ADD COLUMN IF NOT EXISTS expires_at timestamptz;

CREATE INDEX IF NOT EXISTS bookings_expires_at_idx ON public.bookings (expires_at) WHERE status = 'pending';
CREATE INDEX IF NOT EXISTS bookings_payment_reference_idx ON public.bookings (payment_reference);

-- 2) Payment transactions audit table
CREATE TABLE IF NOT EXISTS public.payment_transactions (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  booking_id uuid NOT NULL REFERENCES public.bookings(id) ON DELETE CASCADE,
  provider text NOT NULL DEFAULT 'swedbank_banklink',
  stamp text NOT NULL UNIQUE,
  amount numeric NOT NULL,
  currency text NOT NULL DEFAULT 'EUR',
  service_code text,
  status text NOT NULL DEFAULT 'initiated',
  raw_request jsonb,
  raw_response jsonb,
  mac_valid boolean,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT ALL ON public.payment_transactions TO service_role;
ALTER TABLE public.payment_transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view payment transactions"
  ON public.payment_transactions FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

GRANT SELECT ON public.payment_transactions TO authenticated;

CREATE TRIGGER payment_transactions_touch_updated_at
  BEFORE UPDATE ON public.payment_transactions
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- 3) Auto-cancel expired pending bookings
CREATE OR REPLACE FUNCTION public.cancel_expired_pending_bookings()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  affected integer;
BEGIN
  UPDATE public.bookings
     SET status = 'cancelled',
         payment_status = 'failed'
   WHERE status = 'pending'
     AND payment_option IN ('full','deposit')
     AND payment_status IN ('unpaid','pending')
     AND expires_at IS NOT NULL
     AND expires_at < now();
  GET DIAGNOSTICS affected = ROW_COUNT;
  RETURN affected;
END;
$$;

-- 4) pg_cron every 5 minutes
CREATE EXTENSION IF NOT EXISTS pg_cron;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'cancel-expired-pending-bookings') THEN
    PERFORM cron.unschedule('cancel-expired-pending-bookings');
  END IF;
END $$;

SELECT cron.schedule(
  'cancel-expired-pending-bookings',
  '*/5 * * * *',
  $$ SELECT public.cancel_expired_pending_bookings(); $$
);
