-- ============================================================
-- DEMO SEED — FOR LOCAL DEVELOPMENT ONLY
-- Never run this on staging or production.
-- Run with: supabase db seed (local only)
-- ============================================================
--
-- This file inserts 2 fictional seller accounts and 3 realistic
-- B2B surplus lots (clothing, electronics, beauty). All lots are
-- created with status = 'draft' so they will NEVER appear on the
-- live marketplace, even if this file is accidentally executed
-- against a non-local database.

DO $$
DECLARE
  seller_1_user_id uuid := gen_random_uuid();
  seller_2_user_id uuid := gen_random_uuid();
  seller_1_profile_id uuid;
  seller_2_profile_id uuid;
  lot_clothing_id uuid := gen_random_uuid();
  lot_electronics_id uuid := gen_random_uuid();
  lot_beauty_id uuid := gen_random_uuid();
BEGIN
  -- Fictional auth users
  INSERT INTO auth.users (id, instance_id, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, aud, role, created_at, updated_at)
  VALUES
    (seller_1_user_id, '00000000-0000-0000-0000-000000000000', 'demo.seller1@example.test', crypt('DemoPass123!', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}'::jsonb, '{}'::jsonb, 'authenticated', 'authenticated', now(), now()),
    (seller_2_user_id, '00000000-0000-0000-0000-000000000000', 'demo.seller2@example.test', crypt('DemoPass123!', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}'::jsonb, '{}'::jsonb, 'authenticated', 'authenticated', now(), now());

  -- Profiles (handle_new_user trigger may already create rows; upsert defensively)
  INSERT INTO public.profiles (user_id, email, full_name, company_name, user_type)
  VALUES
    (seller_1_user_id, 'demo.seller1@example.test', 'Demo Seller One', 'DemoMode SAS', 'seller'),
    (seller_2_user_id, 'demo.seller2@example.test', 'Demo Seller Two', 'TestStock SARL', 'seller')
  ON CONFLICT (user_id) DO UPDATE
    SET company_name = EXCLUDED.company_name,
        user_type = EXCLUDED.user_type;

  SELECT id INTO seller_1_profile_id FROM public.profiles WHERE user_id = seller_1_user_id;
  SELECT id INTO seller_2_profile_id FROM public.profiles WHERE user_id = seller_2_user_id;

  -- Lots (status = 'draft' — never visible on the marketplace)
  INSERT INTO public.lots (id, seller_id, title, brand, price, units, pallets, location, category, description, status, images)
  VALUES
    (lot_clothing_id, seller_1_profile_id,
     'Lot démo 300 pièces vêtements mixtes', 'Demo Brand',
     4500, 300, 2, 'France', 'Vêtements',
     'Lot de démonstration — destocking textile homme/femme.',
     'draft', ARRAY[]::text[]),
    (lot_electronics_id, seller_2_profile_id,
     'Lot démo 80 accessoires électroniques', 'Demo Tech',
     12000, 80, 1, 'France', 'Accessoires',
     'Lot de démonstration — petits accessoires électroniques.',
     'draft', ARRAY[]::text[]),
    (lot_beauty_id, seller_1_profile_id,
     'Lot démo 200 produits beauté', 'Demo Beauty',
     2800, 200, 1, 'France', 'Accessoires',
     'Lot de démonstration — cosmétiques et soins.',
     'draft', ARRAY[]::text[]);

  -- Sample lot items
  INSERT INTO public.lot_items (lot_id, name, brand, category, quantity, retail_price)
  VALUES
    (lot_clothing_id, 'T-shirt coton', 'Demo Brand', 'Vêtements', 200, 25),
    (lot_clothing_id, 'Sweat à capuche', 'Demo Brand', 'Vêtements', 100, 55),
    (lot_electronics_id, 'Écouteurs sans fil', 'Demo Tech', 'Accessoires', 80, 220),
    (lot_beauty_id, 'Crème hydratante 50ml', 'Demo Beauty', 'Accessoires', 200, 30);
END $$;
