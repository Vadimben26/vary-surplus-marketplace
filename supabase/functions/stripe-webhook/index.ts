// Required secrets:
// - STRIPE_SECRET_KEY
// - STRIPE_WEBHOOK_SECRET (whsec_...)
// - SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY (auto)
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@14?target=deno";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

serve(async (req) => {
  const STRIPE_SECRET_KEY = Deno.env.get("STRIPE_SECRET_KEY");
  const STRIPE_WEBHOOK_SECRET = Deno.env.get("STRIPE_WEBHOOK_SECRET");
  if (!STRIPE_SECRET_KEY || !STRIPE_WEBHOOK_SECRET) {
    return new Response("Stripe not configured", { status: 503 });
  }

  const stripe = new Stripe(STRIPE_SECRET_KEY, { apiVersion: "2023-10-16" });
  const signature = req.headers.get("stripe-signature");
  const body = await req.text();

  let event: Stripe.Event;
  try {
    event = await stripe.webhooks.constructEventAsync(body, signature!, STRIPE_WEBHOOK_SECRET);
  } catch (err: any) {
    console.error("Webhook signature failed:", err.message);
    return new Response(`Webhook Error: ${err.message}`, { status: 400 });
  }

  const supabaseAdmin = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
  );

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        const lotId = session.metadata?.lotId;
        const paymentIntentId = session.payment_intent as string;

        // Update pending order created at checkout time
        const { data: updatedOrder } = await supabaseAdmin
          .from("orders")
          .update({
            status: "paid",
            stripe_payment_intent_id: paymentIntentId,
          })
          .eq("stripe_checkout_session_id", session.id)
          .select("id")
          .maybeSingle();

        // Mark lot as sold
        if (lotId) {
          await supabaseAdmin.from("lots").update({ status: "sold" }).eq("id", lotId);
        }

        // Fire-and-forget transactional emails
        if (updatedOrder?.id) {
          const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
          const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
          const headers = {
            Authorization: `Bearer ${serviceKey}`,
            "Content-Type": "application/json",
          };
          const orderBody = JSON.stringify({ orderId: updatedOrder.id });
          await Promise.allSettled([
            fetch(`${supabaseUrl}/functions/v1/send-order-confirmation`, { method: "POST", headers, body: orderBody }),
            fetch(`${supabaseUrl}/functions/v1/send-seller-order-notification`, { method: "POST", headers, body: orderBody }),
          ]);
        }
        break;
      }

      case "payment_intent.payment_failed": {
        const pi = event.data.object as Stripe.PaymentIntent;
        await supabaseAdmin
          .from("orders")
          .update({ status: "cancelled" })
          .eq("stripe_payment_intent_id", pi.id);
        break;
      }

      case "customer.subscription.created":
      case "customer.subscription.updated": {
        const subscription = event.data.object as Stripe.Subscription;
        const plan = subscription.metadata?.plan;
        const profileId = subscription.metadata?.profile_id;
        if (plan && profileId) {
          const { data: existing } = await supabaseAdmin
            .from("subscriptions")
            .select("id")
            .eq("stripe_subscription_id", subscription.id)
            .maybeSingle();
          const subData = {
            user_id: profileId,
            plan,
            status: subscription.status === "active" ? "active" :
                    subscription.status === "past_due" ? "past_due" :
                    subscription.status === "trialing" ? "trialing" : "cancelled",
            stripe_subscription_id: subscription.id,
            stripe_customer_id: subscription.customer as string,
            current_period_start: new Date(subscription.current_period_start * 1000).toISOString(),
            current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
          };
          if (existing) {
            await supabaseAdmin.from("subscriptions").update(subData).eq("id", existing.id);
          } else {
            await supabaseAdmin.from("subscriptions").insert(subData);
          }
        }
        break;
      }

      case "customer.subscription.deleted": {
        const subscription = event.data.object as Stripe.Subscription;
        await supabaseAdmin
          .from("subscriptions")
          .update({ status: "cancelled" })
          .eq("stripe_subscription_id", subscription.id);
        break;
      }
    }
  } catch (err) {
    console.error("Webhook handler error:", err);
    // Still return 200 to avoid Stripe retries on internal failures we already logged
  }

  return new Response(JSON.stringify({ received: true }), {
    headers: { "Content-Type": "application/json" }, status: 200,
  });
});
