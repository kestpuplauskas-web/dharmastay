
-- car_investments
CREATE TABLE public.car_investments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  car_id uuid NOT NULL REFERENCES public.cars(id) ON DELETE CASCADE,
  amount numeric NOT NULL DEFAULT 0,
  purchase_date date NOT NULL DEFAULT CURRENT_DATE,
  note text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.car_investments TO authenticated;
GRANT ALL ON public.car_investments TO service_role;
ALTER TABLE public.car_investments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage car_investments" ON public.car_investments
  FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
CREATE TRIGGER trg_car_investments_updated BEFORE UPDATE ON public.car_investments
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
CREATE INDEX idx_car_investments_car ON public.car_investments(car_id);

-- car_maintenance
CREATE TABLE public.car_maintenance (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  car_id uuid NOT NULL REFERENCES public.cars(id) ON DELETE CASCADE,
  type text NOT NULL,
  due_date date,
  last_done_at date,
  note text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (car_id, type)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.car_maintenance TO authenticated;
GRANT ALL ON public.car_maintenance TO service_role;
ALTER TABLE public.car_maintenance ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage car_maintenance" ON public.car_maintenance
  FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
CREATE TRIGGER trg_car_maintenance_updated BEFORE UPDATE ON public.car_maintenance
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
CREATE INDEX idx_car_maintenance_car ON public.car_maintenance(car_id);

-- expenses
CREATE TABLE public.expenses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  category text NOT NULL DEFAULT 'other',
  amount numeric NOT NULL DEFAULT 0,
  expense_date date NOT NULL DEFAULT CURRENT_DATE,
  car_id uuid REFERENCES public.cars(id) ON DELETE SET NULL,
  note text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.expenses TO authenticated;
GRANT ALL ON public.expenses TO service_role;
ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage expenses" ON public.expenses
  FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
CREATE TRIGGER trg_expenses_updated BEFORE UPDATE ON public.expenses
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
CREATE INDEX idx_expenses_date ON public.expenses(expense_date);
CREATE INDEX idx_expenses_car ON public.expenses(car_id);

-- page_views
CREATE TABLE public.page_views (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  path text NOT NULL DEFAULT '/',
  session_id text NOT NULL DEFAULT '',
  referrer text NOT NULL DEFAULT '',
  country text NOT NULL DEFAULT '',
  user_agent text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.page_views TO authenticated;
GRANT INSERT ON public.page_views TO anon, authenticated;
GRANT ALL ON public.page_views TO service_role;
ALTER TABLE public.page_views ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can track" ON public.page_views
  FOR INSERT TO anon, authenticated
  WITH CHECK (true);
CREATE POLICY "Admins read page_views" ON public.page_views
  FOR SELECT TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));
CREATE INDEX idx_page_views_created ON public.page_views(created_at);
CREATE INDEX idx_page_views_session ON public.page_views(session_id);
