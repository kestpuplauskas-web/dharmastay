ALTER TABLE public.property_settings
  DROP COLUMN IF EXISTS notify_checkout_reminder,
  DROP COLUMN IF EXISTS notify_payment_reminder,
  ADD COLUMN IF NOT EXISTS notify_booking_change BOOLEAN NOT NULL DEFAULT true;