-- Restore broad SELECT on profiles for authenticated (needed for FK joins)
DROP POLICY IF EXISTS "Users read own profile" ON public.profiles;

CREATE POLICY "Authenticated read public profile fields"
ON public.profiles
FOR SELECT
TO authenticated
USING (true);

-- Revoke column-level SELECT on sensitive columns from authenticated role
REVOKE SELECT ON public.profiles FROM authenticated;
GRANT SELECT (id, user_id, full_name, company_name, company_description, user_type, created_at, updated_at)
  ON public.profiles TO authenticated;

-- Owners need to read their own sensitive fields too: provide a SECURITY DEFINER function
CREATE OR REPLACE FUNCTION public.get_my_full_profile()
RETURNS SETOF public.profiles
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT * FROM public.profiles WHERE user_id = auth.uid()
$$;

GRANT EXECUTE ON FUNCTION public.get_my_full_profile() TO authenticated;
