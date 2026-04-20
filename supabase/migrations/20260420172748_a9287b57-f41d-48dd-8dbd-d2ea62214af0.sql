-- Fix 1: Block client-side INSERT on orders
-- Order creation is handled exclusively by the create-checkout-session Edge Function via service role.
DROP POLICY IF EXISTS "Authenticated users create orders" ON public.orders;

CREATE POLICY "Orders created by service role only"
  ON public.orders FOR INSERT
  TO authenticated
  WITH CHECK (false);

-- Fix 2: Restrict seller UPDATE on orders to shipping columns only
DROP POLICY IF EXISTS "Sellers update order shipping" ON public.orders;

CREATE POLICY "Sellers update shipping info only"
  ON public.orders FOR UPDATE
  TO authenticated
  USING (seller_id = get_my_profile_id() AND status IN ('paid', 'preparing'))
  WITH CHECK (seller_id = get_my_profile_id());

CREATE OR REPLACE FUNCTION public.prevent_order_sensitive_update()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.amount        IS DISTINCT FROM OLD.amount        OR
     NEW.commission    IS DISTINCT FROM OLD.commission    OR
     NEW.stripe_payment_intent_id IS DISTINCT FROM OLD.stripe_payment_intent_id OR
     NEW.stripe_checkout_session_id IS DISTINCT FROM OLD.stripe_checkout_session_id OR
     NEW.buyer_id      IS DISTINCT FROM OLD.buyer_id      OR
     NEW.seller_id     IS DISTINCT FROM OLD.seller_id     OR
     NEW.lot_id        IS DISTINCT FROM OLD.lot_id        OR
     NEW.status        IS DISTINCT FROM OLD.status
  THEN
    RAISE EXCEPTION 'Sellers may only update tracking_number and shipped_at';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS enforce_seller_order_update_columns ON public.orders;
CREATE TRIGGER enforce_seller_order_update_columns
  BEFORE UPDATE ON public.orders
  FOR EACH ROW
  WHEN (pg_trigger_depth() = 0)
  EXECUTE FUNCTION public.prevent_order_sensitive_update();

-- Fix 3: Block DELETE on lots if an active order exists
DROP POLICY IF EXISTS "Sellers delete own lots" ON public.lots;

CREATE POLICY "Sellers delete lots without active orders"
  ON public.lots FOR DELETE
  TO authenticated
  USING (
    seller_id = get_my_profile_id()
    AND NOT EXISTS (
      SELECT 1 FROM public.orders o
      WHERE o.lot_id = id
        AND o.status IN ('pending_payment', 'paid', 'preparing', 'shipped')
    )
  );

-- Fix 4: Block self-attribution of VIP subscriptions
-- All subscription lifecycle (create, update, cancel) is handled exclusively by the stripe-webhook Edge Function via service role key.
DROP POLICY IF EXISTS "Users create own subscriptions" ON public.subscriptions;
DROP POLICY IF EXISTS "Users update own subscriptions" ON public.subscriptions;
DROP POLICY IF EXISTS "Users delete own subscriptions" ON public.subscriptions;

CREATE POLICY "Subscriptions managed by service role only"
  ON public.subscriptions FOR INSERT
  TO authenticated
  WITH CHECK (false);

CREATE POLICY "Subscriptions updated by service role only"
  ON public.subscriptions FOR UPDATE
  TO authenticated
  USING (false);

CREATE POLICY "Subscriptions deleted by service role only"
  ON public.subscriptions FOR DELETE
  TO authenticated
  USING (false);