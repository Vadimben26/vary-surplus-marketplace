-- Allow admins to read all buyer KYB preferences for the contestation review queue.
CREATE POLICY "Admins read all buyer prefs"
ON public.buyer_preferences
FOR SELECT
TO authenticated
USING (public.is_admin());

-- Allow admins to update KYB status fields (when handling a contestation, an
-- admin may flip kyb_status / buyer_access_level manually). For the level we
-- update profiles below.
CREATE POLICY "Admins update buyer prefs"
ON public.buyer_preferences
FOR UPDATE
TO authenticated
USING (public.is_admin())
WITH CHECK (public.is_admin());

-- Admins also need read access to the buyer-kyb-documents bucket for review.
CREATE POLICY "Admins read buyer KYB documents"
ON storage.objects
FOR SELECT
TO authenticated
USING (bucket_id = 'buyer-kyb-documents' AND public.is_admin());