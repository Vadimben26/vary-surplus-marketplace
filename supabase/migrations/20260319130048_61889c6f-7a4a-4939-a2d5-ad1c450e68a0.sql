
-- Create user_type enum
CREATE TYPE public.user_type AS ENUM ('buyer', 'seller', 'both');

-- Create lot_status enum
CREATE TYPE public.lot_status AS ENUM ('active', 'draft', 'sold');

-- =====================
-- PROFILES TABLE
-- =====================
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT,
  full_name TEXT,
  phone TEXT,
  company_name TEXT,
  company_description TEXT,
  user_type public.user_type NOT NULL DEFAULT 'buyer',
  siret TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- =====================
-- LOTS TABLE
-- =====================
CREATE TABLE public.lots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  seller_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  brand TEXT NOT NULL DEFAULT '',
  price NUMERIC NOT NULL DEFAULT 0,
  units INTEGER NOT NULL DEFAULT 1,
  rating NUMERIC DEFAULT 0,
  location TEXT DEFAULT '',
  category TEXT DEFAULT '',
  description TEXT DEFAULT '',
  status public.lot_status NOT NULL DEFAULT 'draft',
  images TEXT[] DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.lots ENABLE ROW LEVEL SECURITY;

-- =====================
-- LOT_ITEMS TABLE
-- =====================
CREATE TABLE public.lot_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lot_id UUID NOT NULL REFERENCES public.lots(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  quantity INTEGER NOT NULL DEFAULT 1,
  size TEXT DEFAULT ''
);

ALTER TABLE public.lot_items ENABLE ROW LEVEL SECURITY;

-- =====================
-- FAVORITES TABLE
-- =====================
CREATE TABLE public.favorites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  lot_id UUID NOT NULL REFERENCES public.lots(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, lot_id)
);

ALTER TABLE public.favorites ENABLE ROW LEVEL SECURITY;

-- =====================
-- CART_ITEMS TABLE
-- =====================
CREATE TABLE public.cart_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  lot_id UUID NOT NULL REFERENCES public.lots(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, lot_id)
);

ALTER TABLE public.cart_items ENABLE ROW LEVEL SECURITY;

-- =====================
-- MESSAGES TABLE
-- =====================
CREATE TABLE public.messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sender_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  receiver_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  lot_id UUID REFERENCES public.lots(id) ON DELETE SET NULL,
  content TEXT NOT NULL,
  read BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

-- Enable realtime for messages
ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;

-- =====================
-- HELPER FUNCTIONS (SECURITY DEFINER)
-- =====================

-- Get current user's profile id
CREATE OR REPLACE FUNCTION public.get_my_profile_id()
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT id FROM public.profiles WHERE user_id = auth.uid() LIMIT 1
$$;

-- Check if current user is seller of a lot
CREATE OR REPLACE FUNCTION public.is_seller_of_lot(_lot_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.lots l
    JOIN public.profiles p ON l.seller_id = p.id
    WHERE l.id = _lot_id AND p.user_id = auth.uid()
  )
$$;

-- Check if current user is seller (user_type)
CREATE OR REPLACE FUNCTION public.is_seller()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE user_id = auth.uid() AND user_type IN ('seller', 'both')
  )
$$;

-- =====================
-- UPDATED_AT TRIGGER
-- =====================
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_lots_updated_at
  BEFORE UPDATE ON public.lots
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- =====================
-- AUTO-CREATE PROFILE ON SIGNUP
-- =====================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (user_id, email)
  VALUES (NEW.id, NEW.email);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- =====================
-- RLS POLICIES
-- =====================

-- PROFILES: users read all profiles (for seller info display), update only own
CREATE POLICY "Anyone can read profiles"
  ON public.profiles FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users update own profile"
  ON public.profiles FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid());

-- LOTS: everyone reads active lots + sellers see their own drafts/sold
CREATE POLICY "Read active lots or own lots"
  ON public.lots FOR SELECT
  TO authenticated
  USING (status = 'active' OR seller_id = public.get_my_profile_id());

-- Allow anon to also read active lots (for marketplace browsing before login)
CREATE POLICY "Anon read active lots"
  ON public.lots FOR SELECT
  TO anon
  USING (status = 'active');

CREATE POLICY "Sellers insert lots"
  ON public.lots FOR INSERT
  TO authenticated
  WITH CHECK (seller_id = public.get_my_profile_id() AND public.is_seller());

CREATE POLICY "Sellers update own lots"
  ON public.lots FOR UPDATE
  TO authenticated
  USING (seller_id = public.get_my_profile_id());

CREATE POLICY "Sellers delete own lots"
  ON public.lots FOR DELETE
  TO authenticated
  USING (seller_id = public.get_my_profile_id());

-- LOT_ITEMS: read if lot is active or own, CUD if owner
CREATE POLICY "Read lot items of visible lots"
  ON public.lot_items FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.lots l
      WHERE l.id = lot_id AND (l.status = 'active' OR l.seller_id = public.get_my_profile_id())
    )
  );

CREATE POLICY "Anon read active lot items"
  ON public.lot_items FOR SELECT
  TO anon
  USING (
    EXISTS (SELECT 1 FROM public.lots l WHERE l.id = lot_id AND l.status = 'active')
  );

CREATE POLICY "Sellers insert lot items"
  ON public.lot_items FOR INSERT
  TO authenticated
  WITH CHECK (public.is_seller_of_lot(lot_id));

CREATE POLICY "Sellers update own lot items"
  ON public.lot_items FOR UPDATE
  TO authenticated
  USING (public.is_seller_of_lot(lot_id));

CREATE POLICY "Sellers delete own lot items"
  ON public.lot_items FOR DELETE
  TO authenticated
  USING (public.is_seller_of_lot(lot_id));

-- FAVORITES: own only
CREATE POLICY "Users manage own favorites"
  ON public.favorites FOR ALL
  TO authenticated
  USING (user_id = public.get_my_profile_id())
  WITH CHECK (user_id = public.get_my_profile_id());

-- CART_ITEMS: own only
CREATE POLICY "Users manage own cart"
  ON public.cart_items FOR ALL
  TO authenticated
  USING (user_id = public.get_my_profile_id())
  WITH CHECK (user_id = public.get_my_profile_id());

-- MESSAGES: sender or receiver only
CREATE POLICY "Users see own messages"
  ON public.messages FOR SELECT
  TO authenticated
  USING (sender_id = public.get_my_profile_id() OR receiver_id = public.get_my_profile_id());

CREATE POLICY "Users send messages"
  ON public.messages FOR INSERT
  TO authenticated
  WITH CHECK (sender_id = public.get_my_profile_id());

CREATE POLICY "Users update own messages"
  ON public.messages FOR UPDATE
  TO authenticated
  USING (sender_id = public.get_my_profile_id() OR receiver_id = public.get_my_profile_id());

-- =====================
-- STORAGE BUCKET
-- =====================
INSERT INTO storage.buckets (id, name, public) VALUES ('lot-images', 'lot-images', true);

CREATE POLICY "Public read lot images"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'lot-images');

CREATE POLICY "Authenticated users upload lot images"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'lot-images');

CREATE POLICY "Users delete own lot images"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (bucket_id = 'lot-images' AND auth.uid()::text = (storage.foldername(name))[1]);

-- =====================
-- INDEXES
-- =====================
CREATE INDEX idx_lots_seller_id ON public.lots(seller_id);
CREATE INDEX idx_lots_status ON public.lots(status);
CREATE INDEX idx_lots_category ON public.lots(category);
CREATE INDEX idx_lot_items_lot_id ON public.lot_items(lot_id);
CREATE INDEX idx_favorites_user_id ON public.favorites(user_id);
CREATE INDEX idx_cart_items_user_id ON public.cart_items(user_id);
CREATE INDEX idx_messages_sender_id ON public.messages(sender_id);
CREATE INDEX idx_messages_receiver_id ON public.messages(receiver_id);
