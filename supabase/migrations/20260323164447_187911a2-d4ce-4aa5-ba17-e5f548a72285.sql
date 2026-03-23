
-- Adidas Originals (lot price 6300€ for 400 units)
UPDATE public.lot_items SET retail_price = 45 WHERE lot_id = '15904a6a-10f9-43a5-b2a6-30b63389058a' AND name LIKE '%Sweat%';
UPDATE public.lot_items SET retail_price = 35 WHERE lot_id = '15904a6a-10f9-43a5-b2a6-30b63389058a' AND name LIKE '%Legging%';
UPDATE public.lot_items SET retail_price = 30 WHERE lot_id = '15904a6a-10f9-43a5-b2a6-30b63389058a' AND name LIKE '%Brassière%';
UPDATE public.lot_items SET retail_price = 25 WHERE lot_id = '15904a6a-10f9-43a5-b2a6-30b63389058a' AND name LIKE '%T-shirt%';

-- Zara Homme Été (lot price 4200€ for 300 units)
UPDATE public.lot_items SET retail_price = 40 WHERE lot_id = '1e455053-1d66-4a90-a19d-8a5b3be36139' AND name LIKE '%Chemise%';
UPDATE public.lot_items SET retail_price = 35 WHERE lot_id = '1e455053-1d66-4a90-a19d-8a5b3be36139' AND name LIKE '%Pantalon%';
UPDATE public.lot_items SET retail_price = 30 WHERE lot_id = '1e455053-1d66-4a90-a19d-8a5b3be36139' AND name LIKE '%Polo%';
UPDATE public.lot_items SET retail_price = 25 WHERE lot_id = '1e455053-1d66-4a90-a19d-8a5b3be36139' AND name LIKE '%Short%';
UPDATE public.lot_items SET retail_price = 15 WHERE lot_id = '1e455053-1d66-4a90-a19d-8a5b3be36139' AND name LIKE '%T-shirt%';

-- L'Oréal Cosmétiques (lot price 3500€ for 250 units)
UPDATE public.lot_items SET retail_price = 25 WHERE lot_id = '489f433c-659c-4060-8639-a2bb7720a610' AND name LIKE '%Crème%';
UPDATE public.lot_items SET retail_price = 18 WHERE lot_id = '489f433c-659c-4060-8639-a2bb7720a610' AND name LIKE '%Fond de teint%';
UPDATE public.lot_items SET retail_price = 15 WHERE lot_id = '489f433c-659c-4060-8639-a2bb7720a610' AND name LIKE '%Mascara%';
UPDATE public.lot_items SET retail_price = 14 WHERE lot_id = '489f433c-659c-4060-8639-a2bb7720a610' AND name LIKE '%Rouge%';

-- Nike Sneakers (lot price 12500€ for 200 units)
UPDATE public.lot_items SET retail_price = 150 WHERE lot_id = '92eec659-ddb8-4d81-a7f0-c627404a264e' AND name LIKE '%90 Classic%';
UPDATE public.lot_items SET retail_price = 140 WHERE lot_id = '92eec659-ddb8-4d81-a7f0-c627404a264e' AND name LIKE '%Essential%';
UPDATE public.lot_items SET retail_price = 180 WHERE lot_id = '92eec659-ddb8-4d81-a7f0-c627404a264e' AND name LIKE '%97%';

-- Tommy Hilfiger (lot price 7800€ for 150 units)
UPDATE public.lot_items SET retail_price = 130 WHERE lot_id = '96f93a8b-8ede-47c2-93ef-4cb5730cb595' AND name LIKE '%Sac%';
UPDATE public.lot_items SET retail_price = 50 WHERE lot_id = '96f93a8b-8ede-47c2-93ef-4cb5730cb595' AND name LIKE '%Ceinture%';
UPDATE public.lot_items SET retail_price = 60 WHERE lot_id = '96f93a8b-8ede-47c2-93ef-4cb5730cb595' AND name LIKE '%Portefeuille%';
UPDATE public.lot_items SET retail_price = 70 WHERE lot_id = '96f93a8b-8ede-47c2-93ef-4cb5730cb595' AND name LIKE '%Écharpe%';

-- Haddad Brands enfant (lot price 8500€ for 500 units)
UPDATE public.lot_items SET retail_price = 35 WHERE lot_id = 'b5483b89-1081-4d9d-b52c-2dc19570cdef' AND name LIKE '%Casquette%';
UPDATE public.lot_items SET retail_price = 40 WHERE lot_id = 'b5483b89-1081-4d9d-b52c-2dc19570cdef' AND name LIKE '%Legging%';

-- Fallback for any remaining items still at 0
UPDATE public.lot_items SET retail_price = 40 WHERE retail_price = 0 OR retail_price IS NULL;
