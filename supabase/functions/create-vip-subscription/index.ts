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
        JSON.stringify({ error: "Stripe not configured. Add your STRIPE_SECRET_KEY to activate subscriptions." }),
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

    const { plan, success_url, cancel_url } = await req.json();
    if (!["buyer_vip", "seller_vip"].includes(plan)) {
      return new Response(JSON.stringify({ error: "Invalid plan" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: profile } = await supabaseClient
      .from("profiles")
      .select("id, full_name")
      .eq("user_id", user.id)
      .single();

    if (!profile) {
      return new Response(JSON.stringify({ error: "Profile not found" }), {
        status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const stripe = new Stripe(STRIPE_SECRET_KEY, { apiVersion: "2023-10-16" });

    // Find or create customer
    const customers = await stripe.customers.list({ email: user.email, limit: 1 });
    let customerId: string;
    if (customers.data.length > 0) {
      customerId = customers.data[0].id;
    } else {
      const customer = await stripe.customers.create({
        email: user.email,
        name: profile.full_name || undefined,
        metadata: { profile_id: profile.id, user_id: user.id },
      });
      customerId = customer.id;
    }

    // Find or create the price for the VIP plan (299€/month)
    const productName = plan === "buyer_vip" ? "Vary Buyer VIP" : "Vary Seller VIP";
    const products = await stripe.products.list({ limit: 100 });
    let product = products.data.find(p => p.name === productName && p.active);
    
    if (!product) {
      product = await stripe.products.create({
        name: productName,
        description: plan === "buyer_vip" 
          ? "Accès anticipé aux lots + support prioritaire"
          : "Insights détaillés + visibilité boostée + templates messages",
      });
    }

    const priceAmount = plan === "seller_vip" ? 9900 : 29900; // seller 99€, buyer 299€
    const prices = await stripe.prices.list({ product: product.id, active: true });
    let price = prices.data.find(p => p.unit_amount === priceAmount && p.recurring?.interval === "month");
    
    if (!price) {
      price = await stripe.prices.create({
        product: product.id,
        unit_amount: priceAmount,
        currency: "eur",
        recurring: { interval: "month" },
      });
    }

    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      payment_method_types: ["card"],
      line_items: [{ price: price.id, quantity: 1 }],
      mode: "subscription",
      success_url: success_url || `${req.headers.get("origin")}/profil?subscription=success`,
      cancel_url: cancel_url || `${req.headers.get("origin")}/profil`,
      subscription_data: {
        metadata: { plan, profile_id: profile.id },
      },
    });

    return new Response(JSON.stringify({ url: session.url, session_id: session.id }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Subscription error:", error);
    return new Response(JSON.stringify({ error: "An internal error occurred. Please try again." }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
