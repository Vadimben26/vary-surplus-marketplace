
-- Add new columns to buyer_preferences for the redesigned questionnaire
ALTER TABLE public.buyer_preferences
  ADD COLUMN IF NOT EXISTS billing_address_line2 text,
  ADD COLUMN IF NOT EXISTS shipping_address_line1 text,
  ADD COLUMN IF NOT EXISTS shipping_address_line2 text,
  ADD COLUMN IF NOT EXISTS shipping_city text,
  ADD COLUMN IF NOT EXISTS shipping_postal_code text,
  ADD COLUMN IF NOT EXISTS shipping_country text,
  ADD COLUMN IF NOT EXISTS same_shipping_address boolean DEFAULT true,
  ADD COLUMN IF NOT EXISTS delivery_countries text[] DEFAULT '{}'::text[],
  ADD COLUMN IF NOT EXISTS annual_revenue text,
  ADD COLUMN IF NOT EXISTS revenue_document_url text,
  ADD COLUMN IF NOT EXISTS terms_accepted boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS info_certified boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS alerts_consent boolean DEFAULT false;

-- Create storage bucket for revenue justification documents
INSERT INTO storage.buckets (id, name, public)
VALUES ('buyer-documents', 'buyer-documents', false)
ON CONFLICT (id) DO NOTHING;

-- RLS: users can read their own documents
CREATE POLICY "Users read own buyer documents"
ON storage.objects FOR SELECT
USING (bucket_id = 'buyer-documents' AND auth.uid()::text = (storage.foldername(name))[1]);

-- RLS: users can upload their own documents
CREATE POLICY "Users upload own buyer documents"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'buyer-documents' AND auth.uid()::text = (storage.foldername(name))[1]);

-- RLS: users can update their own documents
CREATE POLICY "Users update own buyer documents"
ON storage.objects FOR UPDATE
USING (bucket_id = 'buyer-documents' AND auth.uid()::text = (storage.foldername(name))[1]);

-- RLS: users can delete their own documents
CREATE POLICY "Users delete own buyer documents"
ON storage.objects FOR DELETE
USING (bucket_id = 'buyer-documents' AND auth.uid()::text = (storage.foldername(name))[1]);
