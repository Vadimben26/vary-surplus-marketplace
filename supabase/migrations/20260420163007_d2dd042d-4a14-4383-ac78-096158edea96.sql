-- Purge demo seed data injected via earlier migrations.
-- Schema, RLS, functions, indexes, enums are all preserved.

-- 1) Remove fake lots and their dependencies (lot_items, favorites, cart_items
--    cascade via FK or are explicitly cleared below).
DELETE FROM public.cart_items
WHERE lot_id IN (
  '1e455053-1d66-4a90-a19d-8a5b3be36139',
  '15904a6a-10f9-43a5-b2a6-30b63389058a',
  '489f433c-659c-4060-8639-a2bb7720a610',
  '92eec659-ddb8-4d81-a7f0-c627404a264e',
  '96f93a8b-8ede-47c2-93ef-4cb5730cb595',
  'b5483b89-1081-4d9d-b52c-2dc19570cdef'
);

DELETE FROM public.favorites
WHERE lot_id IN (
  '1e455053-1d66-4a90-a19d-8a5b3be36139',
  '15904a6a-10f9-43a5-b2a6-30b63389058a',
  '489f433c-659c-4060-8639-a2bb7720a610',
  '92eec659-ddb8-4d81-a7f0-c627404a264e',
  '96f93a8b-8ede-47c2-93ef-4cb5730cb595',
  'b5483b89-1081-4d9d-b52c-2dc19570cdef'
);

DELETE FROM public.lot_items
WHERE lot_id IN (
  '1e455053-1d66-4a90-a19d-8a5b3be36139',
  '15904a6a-10f9-43a5-b2a6-30b63389058a',
  '489f433c-659c-4060-8639-a2bb7720a610',
  '92eec659-ddb8-4d81-a7f0-c627404a264e',
  '96f93a8b-8ede-47c2-93ef-4cb5730cb595',
  'b5483b89-1081-4d9d-b52c-2dc19570cdef'
);

DELETE FROM public.lots
WHERE id IN (
  '1e455053-1d66-4a90-a19d-8a5b3be36139',
  '15904a6a-10f9-43a5-b2a6-30b63389058a',
  '489f433c-659c-4060-8639-a2bb7720a610',
  '92eec659-ddb8-4d81-a7f0-c627404a264e',
  '96f93a8b-8ede-47c2-93ef-4cb5730cb595',
  'b5483b89-1081-4d9d-b52c-2dc19570cdef'
);

-- 2) Remove fake seller accounts (profiles + auth users cascade).
DELETE FROM public.seller_preferences
WHERE user_id IN (
  'a1111111-1111-1111-1111-111111111aaa',
  'b2222222-2222-2222-2222-222222222bbb',
  'c3333333-3333-3333-3333-333333333ccc'
);

DELETE FROM public.buyer_preferences
WHERE user_id IN (
  'a1111111-1111-1111-1111-111111111aaa',
  'b2222222-2222-2222-2222-222222222bbb',
  'c3333333-3333-3333-3333-333333333ccc'
);

DELETE FROM public.profiles
WHERE user_id IN (
  'a1111111-1111-1111-1111-111111111aaa',
  'b2222222-2222-2222-2222-222222222bbb',
  'c3333333-3333-3333-3333-333333333ccc'
);

DELETE FROM auth.identities
WHERE user_id IN (
  'a1111111-1111-1111-1111-111111111aaa',
  'b2222222-2222-2222-2222-222222222bbb',
  'c3333333-3333-3333-3333-333333333ccc'
);

DELETE FROM auth.users
WHERE id IN (
  'a1111111-1111-1111-1111-111111111aaa',
  'b2222222-2222-2222-2222-222222222bbb',
  'c3333333-3333-3333-3333-333333333ccc'
);