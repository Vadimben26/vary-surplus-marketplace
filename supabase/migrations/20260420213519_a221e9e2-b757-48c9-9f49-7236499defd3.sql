CREATE TABLE public.disputes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL UNIQUE REFERENCES public.orders(id) ON DELETE CASCADE,
  buyer_id uuid NOT NULL REFERENCES public.profiles(id),
  seller_id uuid NOT NULL REFERENCES public.profiles(id),
  reason text NOT NULL,
  details text,
  status text NOT NULL DEFAULT 'open'
    CHECK (status IN ('open', 'admin_review', 'resolved_refund', 'resolved_release')),
  resolution_note text,
  evidence_urls text[] DEFAULT '{}',
  opened_at timestamptz NOT NULL DEFAULT now(),
  resolved_at timestamptz,
  resolved_by uuid REFERENCES public.profiles(id)
);

ALTER TABLE public.disputes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Buyers see own disputes"
  ON public.disputes FOR SELECT TO authenticated
  USING (buyer_id = get_my_profile_id());

CREATE POLICY "Sellers see own disputes"
  ON public.disputes FOR SELECT TO authenticated
  USING (seller_id = get_my_profile_id());

CREATE POLICY "Admins see all disputes"
  ON public.disputes FOR SELECT TO authenticated
  USING (is_admin());

CREATE POLICY "Buyers open disputes"
  ON public.disputes FOR INSERT TO authenticated
  WITH CHECK (
    buyer_id = get_my_profile_id()
    AND EXISTS (
      SELECT 1 FROM public.orders o
      WHERE o.id = order_id
        AND o.buyer_id = get_my_profile_id()
        AND o.status = 'delivered'
    )
  );

CREATE POLICY "Admins update disputes"
  ON public.disputes FOR UPDATE TO authenticated
  USING (is_admin());

CREATE INDEX idx_disputes_order_id ON public.disputes(order_id);
CREATE INDEX idx_disputes_buyer_id ON public.disputes(buyer_id);
CREATE INDEX idx_disputes_seller_id ON public.disputes(seller_id);
CREATE INDEX idx_disputes_status ON public.disputes(status);

INSERT INTO storage.buckets (id, name, public)
VALUES ('dispute-evidence', 'dispute-evidence', false)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Buyers upload dispute evidence"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'dispute-evidence'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Dispute parties read evidence"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (bucket_id = 'dispute-evidence');