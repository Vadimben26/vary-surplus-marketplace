import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@14.21.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const STRIPE_SECRET_KEY = Deno.env.get("STRIPE_SECRET_KEY");
    if (!STRIPE_SECRET_KEY) {
      return new Response(
        JSON.stringify({ error: "Stripe not configured. Add your STRIPE_SECRET_KEY to activate payments." }),
        { status: 503, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? ""
    );

    const authHeader = req.headers.get("Authorization")!;
    const token = authHeader.replace("Bearer ", "");
    const { data: { user } } = await supabaseClient.auth.getUser(token);
    if (!user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { lot_id, success_url, cancel_url } = await req.json();

    // Get buyer profile
    const { data: buyerProfile } = await supabaseClient
      .from("profiles")
      .select("id, email, full_name")
      .eq("user_id", user.id)
      .single();

    if (!buyerProfile) {
      return new Response(JSON.stringify({ error: "Profile not found" }), {
        status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get lot details
    const { data: lot } = await supabaseClient
      .from("lots")
      .select("*, profiles!lots_seller_id_fkey(id, company_name)")
      .eq("id", lot_id)
      .eq("status", "active")
      .single();

    if (!lot) {
      return new Response(JSON.stringify({ error: "Lot not found or not available" }), {
        status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const stripe = new Stripe(STRIPE_SECRET_KEY, { apiVersion: "2023-10-16" });

    // Find or create Stripe customer
    const customers = await stripe.customers.list({ email: user.email, limit: 1 });
    let customerId: string;
    if (customers.data.length > 0) {
      customerId = customers.data[0].id;
    } else {
      const customer = await stripe.customers.create({
        email: user.email,
        name: buyerProfile.full_name || undefined,
        metadata: { profile_id: buyerProfile.id, user_id: user.id },
      });
      customerId = customer.id;
    }

    // Commission 5% for Vary
    const commission = Math.round(Number(lot.price) * 0.05 * 100); // in cents
    const totalAmount = Math.round(Number(lot.price) * 100); // lot price in cents

    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      payment_method_types: ["card"],
      line_items: [{
        price_data: {
          currency: "eur",
          product_data: {
            name: lot.title,
            description: `${lot.brand} - ${lot.units} unités`,
            images: lot.images?.slice(0, 1) || [],
          },
          unit_amount: totalAmount,
        },
        quantity: 1,
      }],
      mode: "payment",
      success_url: success_url || `${req.headers.get("origin")}/orders?success=true`,
      cancel_url: cancel_url || `${req.headers.get("origin")}/panier`,
      metadata: {
        lot_id: lot.id,
        buyer_profile_id: buyerProfile.id,
        seller_profile_id: lot.seller_id,
        commission: commission.toString(),
      },
      payment_intent_data: {
        // Hold funds (escrow) - capture manually later
        capture_method: "manual",
        metadata: {
          lot_id: lot.id,
          buyer_profile_id: buyerProfile.id,
          seller_profile_id: lot.seller_id,
        },
      },
    });

    return new Response(JSON.stringify({ url: session.url, session_id: session.id }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Checkout error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
