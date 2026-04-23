-- 1. Prix minimum 500€ sur les lots (sauf brouillons)
ALTER TABLE public.lots
  ADD CONSTRAINT lots_min_price_check
  CHECK (status = 'draft' OR price >= 500);

-- 2. Suspension vendeur
ALTER TABLE public.profiles
  ADD COLUMN suspended_until timestamptz;

-- 3. Enrichir disputes avec zone + montant + type
ALTER TABLE public.disputes
  ADD COLUMN dispute_type text NOT NULL DEFAULT 'quality',
  ADD COLUMN zone text,
  ADD COLUMN refund_amount numeric DEFAULT 0,
  ADD COLUMN defect_percentage numeric DEFAULT 0;

-- 4. Détail des références défectueuses
CREATE TABLE public.dispute_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  dispute_id uuid NOT NULL REFERENCES public.disputes(id) ON DELETE CASCADE,
  lot_item_id uuid NOT NULL REFERENCES public.lot_items(id) ON DELETE CASCADE,
  defective_quantity integer NOT NULL CHECK (defective_quantity > 0),
  retail_price_unit numeric NOT NULL DEFAULT 0,
  photo_url text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.dispute_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Buyers create dispute items on own disputes"
  ON public.dispute_items FOR INSERT TO authenticated
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.disputes d
    WHERE d.id = dispute_id AND d.buyer_id = get_my_profile_id()
  ));

CREATE POLICY "Parties read dispute items"
  ON public.dispute_items FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.disputes d
    WHERE d.id = dispute_id
      AND (d.buyer_id = get_my_profile_id() OR d.seller_id = get_my_profile_id())
  ) OR is_admin());

CREATE POLICY "Admins manage dispute items"
  ON public.dispute_items FOR ALL TO authenticated
  USING (is_admin()) WITH CHECK (is_admin());

-- 5. Réclamations transport (séparées des litiges qualité)
CREATE TABLE public.transport_claims (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  buyer_id uuid NOT NULL,
  seller_id uuid NOT NULL,
  description text NOT NULL,
  evidence_urls text[] NOT NULL DEFAULT '{}',
  claim_amount numeric DEFAULT 0,
  status text NOT NULL DEFAULT 'open',
  resolution_note text,
  resolved_at timestamptz,
  resolved_by uuid,
  opened_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.transport_claims ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Buyers open transport claims"
  ON public.transport_claims FOR INSERT TO authenticated
  WITH CHECK (buyer_id = get_my_profile_id() AND EXISTS (
    SELECT 1 FROM public.orders o
    WHERE o.id = order_id AND o.buyer_id = get_my_profile_id()
      AND o.status = 'delivered'
  ));

CREATE POLICY "Buyers see own transport claims"
  ON public.transport_claims FOR SELECT TO authenticated
  USING (buyer_id = get_my_profile_id());

CREATE POLICY "Sellers see own transport claims"
  ON public.transport_claims FOR SELECT TO authenticated
  USING (seller_id = get_my_profile_id());

CREATE POLICY "Admins manage transport claims"
  ON public.transport_claims FOR ALL TO authenticated
  USING (is_admin()) WITH CHECK (is_admin());

-- 6. Appels vendeur (suspension contestée)
CREATE TABLE public.seller_appeals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  seller_id uuid NOT NULL,
  dispute_id uuid REFERENCES public.disputes(id) ON DELETE SET NULL,
  message text NOT NULL,
  evidence_urls text[] NOT NULL DEFAULT '{}',
  status text NOT NULL DEFAULT 'pending',
  admin_decision text,
  decided_at timestamptz,
  decided_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.seller_appeals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Sellers create own appeals"
  ON public.seller_appeals FOR INSERT TO authenticated
  WITH CHECK (seller_id = get_my_profile_id());

CREATE POLICY "Sellers read own appeals"
  ON public.seller_appeals FOR SELECT TO authenticated
  USING (seller_id = get_my_profile_id());

CREATE POLICY "Admins manage appeals"
  ON public.seller_appeals FOR ALL TO authenticated
  USING (is_admin()) WITH CHECK (is_admin());

-- 7. Index pour les requêtes fréquentes
CREATE INDEX idx_dispute_items_dispute_id ON public.dispute_items(dispute_id);
CREATE INDEX idx_transport_claims_order_id ON public.transport_claims(order_id);
CREATE INDEX idx_transport_claims_status ON public.transport_claims(status);
CREATE INDEX idx_seller_appeals_seller_id ON public.seller_appeals(seller_id);
CREATE INDEX idx_seller_appeals_status ON public.seller_appeals(status);