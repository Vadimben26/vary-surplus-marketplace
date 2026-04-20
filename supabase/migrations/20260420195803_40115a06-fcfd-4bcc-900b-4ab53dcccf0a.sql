-- Admin helper function
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE user_id = auth.uid() AND user_type = 'admin'
  )
$$;

CREATE POLICY "Admins read all profiles"
  ON public.profiles FOR SELECT
  TO authenticated
  USING (public.is_admin());

CREATE POLICY "Admins update any profile"
  ON public.profiles FOR UPDATE
  TO authenticated
  USING (public.is_admin());

CREATE POLICY "Admins read all lots"
  ON public.lots FOR SELECT
  TO authenticated
  USING (public.is_admin());

CREATE POLICY "Admins update any lot"
  ON public.lots FOR UPDATE
  TO authenticated
  USING (public.is_admin());

CREATE POLICY "Admins delete any lot"
  ON public.lots FOR DELETE
  TO authenticated
  USING (public.is_admin());

CREATE POLICY "Admins read all orders"
  ON public.orders FOR SELECT
  TO authenticated
  USING (public.is_admin());

CREATE POLICY "Admins update any order"
  ON public.orders FOR UPDATE
  TO authenticated
  USING (public.is_admin());

CREATE POLICY "Admins read all seller preferences"
  ON public.seller_preferences FOR SELECT
  TO authenticated
  USING (public.is_admin());

CREATE POLICY "Admins read all subscriptions"
  ON public.subscriptions FOR SELECT
  TO authenticated
  USING (public.is_admin());

ALTER TABLE public.seller_preferences
  ADD COLUMN IF NOT EXISTS validation_status text DEFAULT 'pending'
    CHECK (validation_status IN ('pending', 'approved', 'rejected')),
  ADD COLUMN IF NOT EXISTS validation_note text,
  ADD COLUMN IF NOT EXISTS validated_at timestamptz,
  ADD COLUMN IF NOT EXISTS validated_by uuid REFERENCES public.profiles(id);