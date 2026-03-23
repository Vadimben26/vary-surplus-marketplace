ALTER TABLE public.lot_items 
  ADD COLUMN IF NOT EXISTS brand text DEFAULT '',
  ADD COLUMN IF NOT EXISTS category text DEFAULT '',
  ADD COLUMN IF NOT EXISTS gender text DEFAULT '',
  ADD COLUMN IF NOT EXISTS reference text DEFAULT '',
  ADD COLUMN IF NOT EXISTS retail_price numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS image_url text DEFAULT '';