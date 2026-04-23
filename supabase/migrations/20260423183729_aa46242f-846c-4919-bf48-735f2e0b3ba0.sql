-- ============================================================
-- 1. Wipe test accounts in dependency order
-- ============================================================
DELETE FROM public.dispute_items;
DELETE FROM public.disputes;
DELETE FROM public.transport_claims;
DELETE FROM public.seller_appeals;
DELETE FROM public.reviews;
DELETE FROM public.messages;
DELETE FROM public.cart_items;
DELETE FROM public.favorites;
DELETE FROM public.orders;
DELETE FROM public.lot_items;
DELETE FROM public.lot_photos;
DELETE FROM public.lots;
DELETE FROM public.subscriptions;
DELETE FROM public.buyer_preferences;
DELETE FROM public.seller_preferences;
DELETE FROM public.profiles;
DELETE FROM auth.users;

-- ============================================================
-- 2. buyer_preferences: profile_type, annual_revenue_range, resale_channels
-- ============================================================
ALTER TABLE public.buyer_preferences
  ADD COLUMN IF NOT EXISTS profile_type text,
  ADD COLUMN IF NOT EXISTS annual_revenue_range text,
  ADD COLUMN IF NOT EXISTS resale_channels text[] DEFAULT '{}'::text[];

ALTER TABLE public.buyer_preferences
  DROP CONSTRAINT IF EXISTS buyer_prefs_profile_type_check;
ALTER TABLE public.buyer_preferences
  ADD CONSTRAINT buyer_prefs_profile_type_check
  CHECK (profile_type IS NULL OR profile_type IN ('business','individual_reseller'));

-- ============================================================
-- 3. seller_preferences.buyer_filters JSONB — replace old filter cols
-- ============================================================
ALTER TABLE public.seller_preferences
  ADD COLUMN IF NOT EXISTS buyer_filters jsonb NOT NULL DEFAULT '{}'::jsonb;

ALTER TABLE public.seller_preferences
  DROP COLUMN IF EXISTS buyer_geography,
  DROP COLUMN IF EXISTS target_countries,
  DROP COLUMN IF EXISTS target_market,
  DROP COLUMN IF EXISTS buyer_categories,
  DROP COLUMN IF EXISTS buyer_min_revenue,
  DROP COLUMN IF EXISTS buyer_types,
  DROP COLUMN IF EXISTS buyer_budget,
  DROP COLUMN IF EXISTS visibility_mode;
