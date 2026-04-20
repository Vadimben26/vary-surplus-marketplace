// Required secrets: STRIPE_SECRET_KEY, SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
//
// NOTE on escrow with Stripe Connect:
// We use `transfer_data.destination` at PaymentIntent creation, which means funds
// are automatically transferred to the seller's connected account at payment time
// (minus the application fee). The actual payout to the seller's bank then follows
// Stripe's standard payout schedule (typically 7 days for new Express accounts).
// The "escrow" timeline in Vary is therefore controlled via the order status:
// funds are considered "released" once the order is marked 'confirmed'.
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@14?target=deno";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const STRIPE_SECRET_KEY = Deno.env.get("STRIPE_SECRET_KEY");
    if (!STRIPE_SECRET_KEY) {
      return new Response(JSON.stringify({ error: "Stripe not configured" }), {
        status: 503, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { orderId } = await req.json();
    if (!orderId) {
      return new Response(JSON.stringify({ error: "Missing orderId" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const { data: order } = await supabaseAdmin
      .from("orders")
      .select("id, status, amount, commission, seller_id, stripe_payment_intent_id")
      .eq("id", orderId)
      .single();

    if (!order) {
      return new Response(JSON.stringify({ error: "Order not found" }), {
        status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!["delivered", "confirmed"].includes(order.status)) {
      return new Response(
        JSON.stringify({ error: "Order must be delivered before releasing funds" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Verify the PaymentIntent exists and was successful (transfer already done by Stripe)
    if (order.stripe_payment_intent_id) {
      const stripe = new Stripe(STRIPE_SECRET_KEY, { apiVersion: "2023-10-16" });
      const pi = await stripe.paymentIntents.retrieve(order.stripe_payment_intent_id);
      if (pi.status !== "succeeded") {
        return new Response(
          JSON.stringify({ error: `PaymentIntent not succeeded (status: ${pi.status})` }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    await supabaseAdmin
      .from("orders")
      .update({ status: "confirmed", confirmed_at: new Date().toISOString() })
      .eq("id", order.id);

    console.log(`Funds released for order ${order.id}`);
    return new Response(JSON.stringify({ success: true, orderId: order.id }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("release-funds error:", err);
    return new Response(JSON.stringify({ error: "Internal error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
