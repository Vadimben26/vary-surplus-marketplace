CREATE TABLE public.reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL UNIQUE REFERENCES public.orders(id) ON DELETE CASCADE,
  lot_id uuid NOT NULL REFERENCES public.lots(id) ON DELETE CASCADE,
  buyer_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  seller_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  rating integer NOT NULL CHECK (rating BETWEEN 1 AND 5),
  comment text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone reads reviews"
  ON public.reviews FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Anon reads reviews"
  ON public.reviews FOR SELECT
  TO anon
  USING (true);

CREATE POLICY "Buyers insert own reviews"
  ON public.reviews FOR INSERT
  TO authenticated
  WITH CHECK (
    buyer_id = get_my_profile_id()
    AND EXISTS (
      SELECT 1 FROM public.orders o
      WHERE o.id = order_id
        AND o.buyer_id = get_my_profile_id()
        AND o.status = 'confirmed'
    )
    AND NOT EXISTS (
      SELECT 1 FROM public.reviews r
      WHERE r.order_id = reviews.order_id
    )
  );

CREATE POLICY "Buyers update own reviews"
  ON public.reviews FOR UPDATE
  TO authenticated
  USING (
    buyer_id = get_my_profile_id()
    AND created_at > now() - interval '48 hours'
  );

CREATE OR REPLACE FUNCTION public.get_seller_rating(seller_profile_id uuid)
RETURNS TABLE(average_rating numeric, review_count integer)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    ROUND(AVG(rating)::numeric, 1) as average_rating,
    COUNT(*)::integer as review_count
  FROM public.reviews
  WHERE seller_id = seller_profile_id;
$$;

CREATE INDEX idx_reviews_seller_id ON public.reviews(seller_id);
CREATE INDEX idx_reviews_order_id ON public.reviews(order_id);