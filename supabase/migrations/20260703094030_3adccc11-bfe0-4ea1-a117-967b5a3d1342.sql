
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS bic text;
ALTER TABLE public.payment_transactions ADD COLUMN IF NOT EXISTS provider_transaction_id text;
ALTER TABLE public.payment_transactions ADD COLUMN IF NOT EXISTS bic text;
CREATE INDEX IF NOT EXISTS payment_transactions_provider_tx_idx
  ON public.payment_transactions (provider_transaction_id);
