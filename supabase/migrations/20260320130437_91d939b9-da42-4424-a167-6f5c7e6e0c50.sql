
-- Step 1: Create auth users and profiles only
INSERT INTO auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, created_at, updated_at, confirmation_token, recovery_token)
VALUES 
  ('a1111111-1111-1111-1111-111111111aaa', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'sophie.martin@boutiquechic.fr', crypt('TestPass123!', gen_salt('bf')), now(), now(), now(), '', ''),
  ('b2222222-2222-2222-2222-222222222bbb', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'lucas.durand@modestock.fr', crypt('TestPass123!', gen_salt('bf')), now(), now(), now(), '', ''),
  ('c3333333-3333-3333-3333-333333333ccc', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'amira.benali@fashionoutlet.fr', crypt('TestPass123!', gen_salt('bf')), now(), now(), now(), '', '')
ON CONFLICT (id) DO NOTHING;

INSERT INTO auth.identities (id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
VALUES
  ('a1111111-1111-1111-1111-111111111aaa', 'a1111111-1111-1111-1111-111111111aaa', 'sophie.martin@boutiquechic.fr', '{"sub":"a1111111-1111-1111-1111-111111111aaa","email":"sophie.martin@boutiquechic.fr"}', 'email', now(), now(), now()),
  ('b2222222-2222-2222-2222-222222222bbb', 'b2222222-2222-2222-2222-222222222bbb', 'lucas.durand@modestock.fr', '{"sub":"b2222222-2222-2222-2222-222222222bbb","email":"lucas.durand@modestock.fr"}', 'email', now(), now(), now()),
  ('c3333333-3333-3333-3333-333333333ccc', 'c3333333-3333-3333-3333-333333333ccc', 'amira.benali@fashionoutlet.fr', '{"sub":"c3333333-3333-3333-3333-333333333ccc","email":"amira.benali@fashionoutlet.fr"}', 'email', now(), now(), now())
ON CONFLICT DO NOTHING;

-- Delete any auto-created profiles and recreate with proper data
DELETE FROM public.profiles WHERE user_id IN ('a1111111-1111-1111-1111-111111111aaa', 'b2222222-2222-2222-2222-222222222bbb', 'c3333333-3333-3333-3333-333333333ccc');

INSERT INTO public.profiles (id, user_id, full_name, company_name, email, user_type, phone)
VALUES 
  ('a1111111-1111-1111-1111-111111111111', 'a1111111-1111-1111-1111-111111111aaa', 'Sophie Martin', 'Boutique Chic Paris', 'sophie.martin@boutiquechic.fr', 'buyer', '+33612345678'),
  ('b2222222-2222-2222-2222-222222222222', 'b2222222-2222-2222-2222-222222222bbb', 'Lucas Durand', 'ModeStock Lyon', 'lucas.durand@modestock.fr', 'buyer', '+33698765432'),
  ('c3333333-3333-3333-3333-333333333333', 'c3333333-3333-3333-3333-333333333ccc', 'Amira Benali', 'Fashion Outlet Marseille', 'amira.benali@fashionoutlet.fr', 'buyer', '+33654321987');
