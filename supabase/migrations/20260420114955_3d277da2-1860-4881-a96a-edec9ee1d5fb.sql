
-- Phase 7: Seller approval workflow
-- Buyers are auto-approved on questionnaire completion.
-- Sellers require manual approval by the Vary team before their lots can go live.

-- Add approval_status to seller_preferences (pending = default, approved | rejected)
ALTER TABLE public.seller_preferences
  ADD COLUMN IF NOT EXISTS approval_status text NOT NULL DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS approved_at timestamp with time zone,
  ADD COLUMN IF NOT EXISTS rejection_reason text;

-- Helper to know if the current user (seller) is approved
CREATE OR REPLACE FUNCTION public.is_seller_approved()
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.seller_preferences
    WHERE user_id = auth.uid() AND approval_status = 'approved'
  )
$$;

-- Restrict lots from being made 'active' unless the seller is approved.
-- We replace the existing INSERT/UPDATE policies with stricter checks.
DROP POLICY IF EXISTS "Sellers insert lots" ON public.lots;
DROP POLICY IF EXISTS "Sellers update own lots" ON public.lots;

CREATE POLICY "Sellers insert lots" ON public.lots
  FOR INSERT TO authenticated
  WITH CHECK (
    seller_id = get_my_profile_id()
    AND is_seller()
    -- Allow draft lots even before approval; only approved sellers can publish active.
    AND (status = 'draft' OR is_seller_approved())
  );

CREATE POLICY "Sellers update own lots" ON public.lots
  FOR UPDATE TO authenticated
  USING (seller_id = get_my_profile_id())
  WITH CHECK (
    seller_id = get_my_profile_id()
    AND (status = 'draft' OR is_seller_approved())
  );
