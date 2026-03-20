
-- Order status enum
CREATE TYPE public.order_status AS ENUM (
  'pending_payment', 'paid', 'preparing', 'shipped', 'delivered', 'confirmed', 'disputed', 'refunded', 'cancelled'
);

-- Orders table
CREATE TABLE public.orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  buyer_id uuid NOT NULL REFERENCES public.profiles(id),
  seller_id uuid NOT NULL REFERENCES public.profiles(id),
  lot_id uuid NOT NULL REFERENCES public.lots(id),
  status order_status NOT NULL DEFAULT 'pending_payment',
  amount numeric NOT NULL,
  commission numeric NOT NULL DEFAULT 0,
  stripe_payment_intent_id text,
  stripe_checkout_session_id text,
  tracking_number text,
  shipped_at timestamp with time zone,
  delivered_at timestamp with time zone,
  confirmed_at timestamp with time zone,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;

-- Buyers see their orders
CREATE POLICY "Buyers see own orders" ON public.orders
  FOR SELECT TO authenticated
  USING (buyer_id = get_my_profile_id());

-- Sellers see orders for their lots
CREATE POLICY "Sellers see orders for their lots" ON public.orders
  FOR SELECT TO authenticated
  USING (seller_id = get_my_profile_id());

-- Only system (edge functions) creates orders via service role, but allow insert for checkout
CREATE POLICY "Authenticated users create orders" ON public.orders
  FOR INSERT TO authenticated
  WITH CHECK (buyer_id = get_my_profile_id());

-- Buyers can confirm receipt
CREATE POLICY "Buyers update own orders" ON public.orders
  FOR UPDATE TO authenticated
  USING (buyer_id = get_my_profile_id());

-- Sellers can update shipping info
CREATE POLICY "Sellers update order shipping" ON public.orders
  FOR UPDATE TO authenticated
  USING (seller_id = get_my_profile_id());

-- Trigger for updated_at
CREATE TRIGGER update_orders_updated_at
  BEFORE UPDATE ON public.orders
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- VIP subscriptions table
CREATE TYPE public.subscription_status AS ENUM ('active', 'cancelled', 'past_due', 'trialing');

CREATE TABLE public.subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id),
  plan text NOT NULL CHECK (plan IN ('buyer_vip', 'seller_vip')),
  status subscription_status NOT NULL DEFAULT 'active',
  stripe_subscription_id text,
  stripe_customer_id text,
  current_period_start timestamp with time zone,
  current_period_end timestamp with time zone,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users see own subscriptions" ON public.subscriptions
  FOR SELECT TO authenticated
  USING (user_id = get_my_profile_id());

CREATE POLICY "Users create own subscriptions" ON public.subscriptions
  FOR INSERT TO authenticated
  WITH CHECK (user_id = get_my_profile_id());

CREATE TRIGGER update_subscriptions_updated_at
  BEFORE UPDATE ON public.subscriptions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
