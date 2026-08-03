CREATE TABLE public.property_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id uuid NOT NULL UNIQUE REFERENCES public.properties(id) ON DELETE CASCADE,

  -- 1. Objekto informacija
  display_name text,
  address text,
  city text,
  postal_code text,
  country text NOT NULL DEFAULT 'LT',
  lat numeric,
  lng numeric,
  timezone text NOT NULL DEFAULT 'Europe/Vilnius',
  currency text NOT NULL DEFAULT 'EUR',
  default_language text NOT NULL DEFAULT 'lt',
  phone text,
  email text,

  -- 2. Viešnagės taisyklės
  checkin_from time NOT NULL DEFAULT '15:00',
  checkin_until time NOT NULL DEFAULT '22:00',
  checkout_until time NOT NULL DEFAULT '11:00',
  min_nights integer NOT NULL DEFAULT 1,
  max_nights integer NOT NULL DEFAULT 30,
  max_advance_days integer NOT NULL DEFAULT 365,
  auto_confirm_bookings boolean NOT NULL DEFAULT false,
  require_phone boolean NOT NULL DEFAULT true,
  require_email boolean NOT NULL DEFAULT true,

  -- 3. Svečių politika
  children_free_until_age integer NOT NULL DEFAULT 3,
  pets_allowed boolean NOT NULL DEFAULT false,
  parties_allowed boolean NOT NULL DEFAULT false,
  quiet_hours_from time NOT NULL DEFAULT '22:00',
  quiet_hours_to time NOT NULL DEFAULT '07:00',
  min_guest_age integer NOT NULL DEFAULT 18,

  -- 4. Mokesčiai
  vat_rate numeric NOT NULL DEFAULT 21,
  city_tax numeric NOT NULL DEFAULT 0,
  city_tax_min_age integer NOT NULL DEFAULT 18,
  extra_guest_fee numeric NOT NULL DEFAULT 0,

  -- 5. Mokėjimai
  deposit_required boolean NOT NULL DEFAULT false,
  deposit_type text NOT NULL DEFAULT 'percent',
  deposit_amount numeric NOT NULL DEFAULT 0,
  payment_due_days integer NOT NULL DEFAULT 3,
  payment_methods jsonb NOT NULL DEFAULT '["cash","bank_transfer"]'::jsonb,
  auto_refund_deposit boolean NOT NULL DEFAULT false,

  -- 6. Atšaukimo politika
  free_cancellation_days integer NOT NULL DEFAULT 7,
  cancellation_fee_type text NOT NULL DEFAULT 'percent',
  cancellation_fee numeric NOT NULL DEFAULT 0,
  no_show_fee numeric NOT NULL DEFAULT 0,
  cancellation_policy_text text,

  -- 7. Sąskaitos
  invoice_series text,
  invoice_next_number integer NOT NULL DEFAULT 1,
  company_name text,
  company_code text,
  company_vat_code text,
  company_address text,
  iban text,
  bank_name text,
  invoice_logo_url text,
  invoice_notes text,

  -- 8. Automatiniai pranešimai
  notify_booking_confirmation boolean NOT NULL DEFAULT true,
  notify_checkin_reminder boolean NOT NULL DEFAULT true,
  notify_checkout_reminder boolean NOT NULL DEFAULT false,
  notify_payment_reminder boolean NOT NULL DEFAULT true,
  notify_review_request boolean NOT NULL DEFAULT false,
  notify_cancellation_confirmation boolean NOT NULL DEFAULT true,
  checkin_reminder_hours_before integer NOT NULL DEFAULT 24,
  review_request_hours_after integer NOT NULL DEFAULT 24,

  -- 9. Branding
  brand_primary_color text NOT NULL DEFAULT '#0f172a',
  brand_secondary_color text NOT NULL DEFAULT '#64748b',
  brand_logo_url text,
  brand_email_logo_url text,
  brand_pdf_logo_url text,

  -- 10. Integracijos
  integrations jsonb NOT NULL DEFAULT '{}'::jsonb,

  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by uuid
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.property_settings TO authenticated;
GRANT ALL ON public.property_settings TO service_role;

ALTER TABLE public.property_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can view property settings"
  ON public.property_settings FOR SELECT TO authenticated USING (true);

CREATE POLICY "Admins can insert property settings"
  ON public.property_settings FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update property settings"
  ON public.property_settings FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete property settings"
  ON public.property_settings FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE OR REPLACE FUNCTION public.set_property_settings_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.set_property_settings_updated_at() FROM anon, authenticated;

CREATE TRIGGER update_property_settings_updated_at
  BEFORE UPDATE ON public.property_settings
  FOR EACH ROW EXECUTE FUNCTION public.set_property_settings_updated_at();