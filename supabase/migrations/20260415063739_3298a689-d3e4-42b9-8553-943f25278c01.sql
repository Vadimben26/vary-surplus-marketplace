
-- Add new columns to seller_preferences for the redesigned 3-step questionnaire
ALTER TABLE public.seller_preferences
  ADD COLUMN IF NOT EXISTS billing_address_line1 text,
  ADD COLUMN IF NOT EXISTS billing_address_line2 text,
  ADD COLUMN IF NOT EXISTS billing_city text,
  ADD COLUMN IF NOT EXISTS billing_postal_code text,
  ADD COLUMN IF NOT EXISTS billing_country text DEFAULT 'France',
  ADD COLUMN IF NOT EXISTS pickup_address_line1 text,
  ADD COLUMN IF NOT EXISTS pickup_address_line2 text,
  ADD COLUMN IF NOT EXISTS pickup_city text,
  ADD COLUMN IF NOT EXISTS pickup_postal_code text,
  ADD COLUMN IF NOT EXISTS pickup_country text,
  ADD COLUMN IF NOT EXISTS same_pickup_address boolean DEFAULT true,
  ADD COLUMN IF NOT EXISTS company_document_url text,
  ADD COLUMN IF NOT EXISTS auth_document_url text,
  ADD COLUMN IF NOT EXISTS buyer_min_revenue text DEFAULT 'all',
  ADD COLUMN IF NOT EXISTS buyer_geography text DEFAULT 'all_verified',
  ADD COLUMN IF NOT EXISTS buyer_categories text[] DEFAULT '{}'::text[],
  ADD COLUMN IF NOT EXISTS seller_certified boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS terms_accepted boolean DEFAULT false;

-- Create storage bucket for seller verification documents
INSERT INTO storage.buckets (id, name, public)
VALUES ('seller-documents', 'seller-documents', false)
ON CONFLICT (id) DO NOTHING;

-- RLS policies for seller-documents bucket
CREATE POLICY "Users read own seller documents"
ON storage.objects FOR SELECT
USING (bucket_id = 'seller-documents' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users upload own seller documents"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'seller-documents' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users update own seller documents"
ON storage.objects FOR UPDATE
USING (bucket_id = 'seller-documents' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users delete own seller documents"
ON storage.objects FOR DELETE
USING (bucket_id = 'seller-documents' AND auth.uid()::text = (storage.foldername(name))[1]);
