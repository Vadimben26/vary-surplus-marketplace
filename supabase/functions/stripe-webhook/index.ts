import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@14.21.0";
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
    event = stripe.webhooks.constructEvent(body, signature!, STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    console.error("Webhook signature verification failed:", err.message);
    return new Response(`Webhook Error: ${err.message}`, { status: 400 });
  }

  const supabaseAdmin = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
  );

  switch (event.type) {
    case "checkout.session.completed": {
      const session = event.data.object as Stripe.Checkout.Session;
      const { lot_id, buyer_profile_id, seller_profile_id, commission } = session.metadata || {};

      if (lot_id && buyer_profile_id && seller_profile_id) {
        // Create order
        await supabaseAdmin.from("orders").insert({
          buyer_id: buyer_profile_id,
          seller_id: seller_profile_id,
          lot_id,
          status: "paid",
          amount: (session.amount_total || 0) / 100,
          commission: parseInt(commission || "0") / 100,
          stripe_payment_intent_id: session.payment_intent as string,
          stripe_checkout_session_id: session.id,
        });

        // Mark lot as sold
        await supabaseAdmin.from("lots").update({ status: "sold" }).eq("id", lot_id);
      }
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
          .single();

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

  return new Response(JSON.stringify({ received: true }), {
    headers: { "Content-Type": "application/json" },
  });
});
