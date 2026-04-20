-- Référentiel des routes de transport entre pays UE
CREATE TABLE public.shipping_routes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  origin_country text NOT NULL,
  destination_country text NOT NULL,
  distance_km integer NOT NULL,
  category text NOT NULL CHECK (category IN ('Court', 'Moyen', 'Long', 'Complexe')),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (origin_country, destination_country)
);

CREATE INDEX idx_shipping_routes_origin ON public.shipping_routes(origin_country);
CREATE INDEX idx_shipping_routes_dest ON public.shipping_routes(destination_country);

ALTER TABLE public.shipping_routes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read shipping routes"
  ON public.shipping_routes FOR SELECT
  TO anon, authenticated
  USING (true);

-- Référentiel des paramètres tarifaires
CREATE TABLE public.shipping_pricing (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  category text NOT NULL UNIQUE CHECK (category IN ('Court', 'Moyen', 'Long', 'Complexe')),
  cost_per_pallet numeric NOT NULL,
  display_order integer NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.shipping_pricing ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read shipping pricing"
  ON public.shipping_pricing FOR SELECT
  TO anon, authenticated
  USING (true);

INSERT INTO public.shipping_pricing (category, cost_per_pallet, display_order) VALUES
  ('Court', 60, 1),
  ('Moyen', 85, 2),
  ('Long', 115, 3),
  ('Complexe', 150, 4);

-- Coefficients selon le nombre de palettes
CREATE TABLE public.shipping_pallet_coefficients (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  max_pallets integer NOT NULL,
  coefficient numeric NOT NULL,
  display_order integer NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.shipping_pallet_coefficients ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read pallet coefficients"
  ON public.shipping_pallet_coefficients FOR SELECT
  TO anon, authenticated
  USING (true);

INSERT INTO public.shipping_pallet_coefficients (max_pallets, coefficient, display_order) VALUES
  (2, 1.25, 1),
  (4, 1.10, 2),
  (6, 1.00, 3),
  (9999, 0.90, 4);

-- Ajout du nombre de palettes sur les lots
ALTER TABLE public.lots ADD COLUMN pallets integer NOT NULL DEFAULT 1 CHECK (pallets >= 1);

-- Ajout du pays de livraison de l'acheteur
ALTER TABLE public.buyer_preferences ADD COLUMN shipping_country_for_filter text;

-- Backfill: copier shipping_country existant si dispo
UPDATE public.buyer_preferences SET shipping_country_for_filter = shipping_country WHERE shipping_country IS NOT NULL;