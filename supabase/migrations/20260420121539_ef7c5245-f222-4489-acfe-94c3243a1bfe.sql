-- 1. Profiles: restrict reads to own profile only
DROP POLICY IF EXISTS "Anyone can read profiles" ON public.profiles;

CREATE POLICY "Users read own profile"
ON public.profiles
FOR SELECT
TO authenticated
USING (user_id = auth.uid());

-- Allow minimal seller info to be visible via lots (sellers' company_name needed on marketplace)
-- We'll create a security definer function to safely expose only public seller fields when needed.
CREATE OR REPLACE FUNCTION public.get_seller_public_info(_profile_id uuid)
RETURNS TABLE(id uuid, company_name text, full_name text)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT id, company_name, full_name
  FROM public.profiles
  WHERE id = _profile_id
$$;

-- 2. Subscriptions: remove client write access entirely
DROP POLICY IF EXISTS "Users create own subscriptions" ON public.subscriptions;
DROP POLICY IF EXISTS "Users update own subscriptions" ON public.subscriptions;
DROP POLICY IF EXISTS "Users delete own subscriptions" ON public.subscriptions;

-- Keep only SELECT for authenticated owners
DROP POLICY IF EXISTS "Users see own subscriptions" ON public.subscriptions;
CREATE POLICY "Users see own subscriptions"
ON public.subscriptions
FOR SELECT
TO authenticated
USING (user_id = get_my_profile_id());
