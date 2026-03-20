-- Function to check if current user is VIP seller
CREATE OR REPLACE FUNCTION public.is_vip_seller()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.subscriptions s
    JOIN public.profiles p ON s.user_id = p.id
    WHERE p.user_id = auth.uid()
      AND s.plan = 'seller_vip'
      AND s.status = 'active'
  )
$$;

-- Function to check if current user is VIP buyer
CREATE OR REPLACE FUNCTION public.is_vip_buyer()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.subscriptions s
    JOIN public.profiles p ON s.user_id = p.id
    WHERE p.user_id = auth.uid()
      AND s.plan = 'buyer_vip'
      AND s.status = 'active'
  )
$$;

-- Allow VIP sellers to see favorites on their own lots
CREATE POLICY "VIP sellers see favorites on own lots"
ON public.favorites
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.lots l
    WHERE l.id = favorites.lot_id
      AND l.seller_id = get_my_profile_id()
  )
  AND is_vip_seller()
);

-- Allow VIP sellers to see cart items on their own lots
CREATE POLICY "VIP sellers see cart items on own lots"
ON public.cart_items
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.lots l
    WHERE l.id = cart_items.lot_id
      AND l.seller_id = get_my_profile_id()
  )
  AND is_vip_seller()
);