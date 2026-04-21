-- 1. Add photos_validated to lots
ALTER TABLE public.lots
  ADD COLUMN IF NOT EXISTS photos_validated boolean NOT NULL DEFAULT false;

-- 2. Create lot_photos table
CREATE TABLE IF NOT EXISTS public.lot_photos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lot_id uuid NOT NULL REFERENCES public.lots(id) ON DELETE CASCADE,
  photo_number smallint NOT NULL CHECK (photo_number BETWEEN 1 AND 9),
  url text NOT NULL,
  media_type text NOT NULL DEFAULT 'photo' CHECK (media_type IN ('photo', 'video')),
  is_required boolean NOT NULL DEFAULT false,
  uploaded_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (lot_id, photo_number)
);

CREATE INDEX IF NOT EXISTS idx_lot_photos_lot_id ON public.lot_photos(lot_id);

-- 3. Enable RLS
ALTER TABLE public.lot_photos ENABLE ROW LEVEL SECURITY;

-- 4. Policies
CREATE POLICY "Anon read photos of active lots"
ON public.lot_photos FOR SELECT TO anon
USING (EXISTS (SELECT 1 FROM public.lots l WHERE l.id = lot_photos.lot_id AND l.status = 'active'));

CREATE POLICY "Read photos of visible lots"
ON public.lot_photos FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.lots l
    WHERE l.id = lot_photos.lot_id
      AND (l.status = 'active' OR l.seller_id = public.get_my_profile_id())
  )
  OR public.is_admin()
);

CREATE POLICY "Sellers insert own lot photos"
ON public.lot_photos FOR INSERT TO authenticated
WITH CHECK (public.is_seller_of_lot(lot_id));

CREATE POLICY "Sellers update own lot photos"
ON public.lot_photos FOR UPDATE TO authenticated
USING (public.is_seller_of_lot(lot_id));

CREATE POLICY "Sellers delete own lot photos"
ON public.lot_photos FOR DELETE TO authenticated
USING (public.is_seller_of_lot(lot_id));

CREATE POLICY "Admins manage all lot photos"
ON public.lot_photos FOR ALL TO authenticated
USING (public.is_admin())
WITH CHECK (public.is_admin());

-- 5. Function + trigger to recompute photos_validated
CREATE OR REPLACE FUNCTION public.recompute_lot_photos_validated()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  target_lot uuid;
  required_count int;
BEGIN
  target_lot := COALESCE(NEW.lot_id, OLD.lot_id);
  SELECT COUNT(*) INTO required_count
  FROM public.lot_photos
  WHERE lot_id = target_lot AND is_required = true;

  UPDATE public.lots
  SET photos_validated = (required_count >= 6)
  WHERE id = target_lot;

  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS trg_lot_photos_validate ON public.lot_photos;
CREATE TRIGGER trg_lot_photos_validate
AFTER INSERT OR UPDATE OR DELETE ON public.lot_photos
FOR EACH ROW EXECUTE FUNCTION public.recompute_lot_photos_validated();

-- 6. Server-side guard: cannot activate a lot without 6 required photos
CREATE OR REPLACE FUNCTION public.enforce_lot_photos_on_activation()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  required_count int;
BEGIN
  IF NEW.status = 'active' AND (TG_OP = 'INSERT' OR OLD.status IS DISTINCT FROM 'active') THEN
    SELECT COUNT(*) INTO required_count
    FROM public.lot_photos
    WHERE lot_id = NEW.id AND is_required = true;
    IF required_count < 6 THEN
      RAISE EXCEPTION 'Cannot activate lot: 6 required photos must be uploaded (found %).', required_count
        USING ERRCODE = 'check_violation';
    END IF;
    NEW.photos_validated := true;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_lots_enforce_photos ON public.lots;
CREATE TRIGGER trg_lots_enforce_photos
BEFORE INSERT OR UPDATE ON public.lots
FOR EACH ROW EXECUTE FUNCTION public.enforce_lot_photos_on_activation();