
-- Buyer preferences table
CREATE TABLE public.buyer_preferences (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  store_types text[] DEFAULT '{}',
  store_link text,
  revenue text,
  activity_duration text,
  categories text[] DEFAULT '{}',
  genders text[] DEFAULT '{}',
  budget text,
  price_per_piece text,
  pieces_per_lot text,
  searched_brands text,
  styles text[] DEFAULT '{}',
  delivery_address text,
  perfect_lot text,
  referral_source text,
  marketing_consent boolean DEFAULT false,
  country text DEFAULT 'France',
  vat_code text,
  address text,
  city text,
  postal_code text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id)
);

-- Seller preferences table
CREATE TABLE public.seller_preferences (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  business_type text,
  website text,
  categories text[] DEFAULT '{}',
  monthly_volume text,
  lot_size text,
  avg_retail_price text,
  brands_text text,
  sells_unbranded text,
  warehouse_location text,
  years_in_business text,
  client_types text[] DEFAULT '{}',
  description text,
  consent boolean DEFAULT false,
  buyer_types text[] DEFAULT '{}',
  buyer_budget text,
  min_order_size text,
  target_market text,
  target_countries text[] DEFAULT '{}',
  visibility_mode text DEFAULT 'all',
  referral_source text,
  country text DEFAULT 'France',
  vat_code text,
  address text,
  city text,
  postal_code text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id)
);

-- RLS
ALTER TABLE public.buyer_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.seller_preferences ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own buyer prefs" ON public.buyer_preferences FOR ALL TO authenticated
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users manage own seller prefs" ON public.seller_preferences FOR ALL TO authenticated
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- Updated_at triggers
CREATE TRIGGER update_buyer_preferences_updated_at BEFORE UPDATE ON public.buyer_preferences
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_seller_preferences_updated_at BEFORE UPDATE ON public.seller_preferences
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
