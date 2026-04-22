-- Add buyer access level to profiles (1 = default, 2 = verified pro)
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS buyer_access_level integer NOT NULL DEFAULT 1;

-- Add KYB columns to buyer_preferences
ALTER TABLE public.buyer_preferences
  ADD COLUMN IF NOT EXISTS kyb_status text NOT NULL DEFAULT 'none',
  ADD COLUMN IF NOT EXISTS kyb_trust_score integer,
  ADD COLUMN IF NOT EXISTS kyb_submitted_at timestamptz,
  ADD COLUMN IF NOT EXISTS kyb_documents text[] DEFAULT '{}'::text[],
  ADD COLUMN IF NOT EXISTS kyb_extracted_data jsonb,
  ADD COLUMN IF NOT EXISTS kyb_rejection_reason text,
  ADD COLUMN IF NOT EXISTS kyb_vat_number text,
  ADD COLUMN IF NOT EXISTS kyb_storefront_url text;

-- Allow authenticated users to read buyer_access_level on profiles (already covered by existing read policy on profiles)

-- Create dedicated private bucket for KYB documents
INSERT INTO storage.buckets (id, name, public)
VALUES ('buyer-kyb-documents', 'buyer-kyb-documents', false)
ON CONFLICT (id) DO NOTHING;

-- RLS for buyer-kyb-documents: users manage files under their own user_id folder
DROP POLICY IF EXISTS "Buyers upload own KYB documents" ON storage.objects;
CREATE POLICY "Buyers upload own KYB documents"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'buyer-kyb-documents'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

DROP POLICY IF EXISTS "Buyers read own KYB documents" ON storage.objects;
CREATE POLICY "Buyers read own KYB documents"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'buyer-kyb-documents'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

DROP POLICY IF EXISTS "Buyers delete own KYB documents" ON storage.objects;
CREATE POLICY "Buyers delete own KYB documents"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'buyer-kyb-documents'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

DROP POLICY IF EXISTS "Admins read all KYB documents" ON storage.objects;
CREATE POLICY "Admins read all KYB documents"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'buyer-kyb-documents' AND public.is_admin()
);