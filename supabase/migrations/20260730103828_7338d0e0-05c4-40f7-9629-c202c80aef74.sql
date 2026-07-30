ALTER TABLE public.bookings
  ADD COLUMN IF NOT EXISTS client_type text NOT NULL DEFAULT 'person',
  ADD COLUMN IF NOT EXISTS birth_date date,
  ADD COLUMN IF NOT EXISTS company_name text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS company_code text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS is_vat_payer boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS vat_number text NOT NULL DEFAULT '';

ALTER TABLE public.bookings
  ADD CONSTRAINT bookings_client_type_check CHECK (client_type IN ('person','company'));