// Required secrets (Supabase Dashboard → Settings → Edge Functions → Secrets):
// - STRIPE_SECRET_KEY (sk_live_... or sk_test_...)
// - STRIPE_PLATFORM_COMMISSION_RATE (e.g. "0.08" for 8%)
// - SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY (auto)
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
      return new Response(
        JSON.stringify({ error: "Stripe not configured. Add STRIPE_SECRET_KEY." }),
        { status: 503, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const commissionRate = parseFloat(Deno.env.get("STRIPE_PLATFORM_COMMISSION_RATE") || "0.08");

    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const token = authHeader.replace("Bearer ", "");

    const supabaseUserClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      { global: { headers: { Authorization: authHeader } } }
    );
    const { data: userData } = await supabaseUserClient.auth.getUser(token);
    const user = userData?.user;
    if (!user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { lotId } = await req.json();
    if (!lotId) {
      return new Response(JSON.stringify({ error: "Missing lotId" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // Buyer profile
    const { data: buyerProfile } = await supabaseAdmin
      .from("profiles")
      .select("id, email, full_name")
      .eq("user_id", user.id)
      .single();
    if (!buyerProfile) {
      return new Response(JSON.stringify({ error: "Buyer profile not found" }), {
        status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Lot + seller
    const { data: lot } = await supabaseAdmin
      .from("lots")
      .select("id, title, price, units, seller_id, status, images")
      .eq("id", lotId)
      .single();
    if (!lot || lot.status !== "active") {
      return new Response(JSON.stringify({ error: "Lot not available" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: sellerProfile } = await supabaseAdmin
      .from("profiles")
      .select("id, stripe_account_id, email")
      .eq("id", lot.seller_id)
      .single();

    if (!sellerProfile?.stripe_account_id) {
      return new Response(
        JSON.stringify({ error: "Ce vendeur n'a pas encore configuré son compte de paiement" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const stripe = new Stripe(STRIPE_SECRET_KEY, { apiVersion: "2023-10-16" });

    const priceCents = Math.round(Number(lot.price) * 100);
    const commissionCents = Math.round(priceCents * commissionRate);

    const origin = req.headers.get("origin") || "";

    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      payment_method_types: ["card"],
      customer_email: user.email,
      line_items: [{
        price_data: {
          currency: "eur",
          product_data: {
            name: lot.title,
            description: `${lot.units} unités`,
            images: lot.images?.slice(0, 1) || [],
          },
          unit_amount: priceCents,
        },
        quantity: 1,
      }],
      payment_intent_data: {
        capture_method: "automatic",
        application_fee_amount: commissionCents,
        transfer_data: { destination: sellerProfile.stripe_account_id },
        metadata: {
          lotId: lot.id,
          buyerUserId: user.id,
          sellerProfileId: sellerProfile.id,
        },
      },
      metadata: {
        lotId: lot.id,
        buyerUserId: user.id,
        sellerProfileId: sellerProfile.id,
      },
      success_url: `${origin}/commandes?payment=success`,
      cancel_url: `${origin}/panier`,
    });

    // Pre-create pending order (service role bypasses RLS)
    await supabaseAdmin.from("orders").insert({
      buyer_id: buyerProfile.id,
      seller_id: sellerProfile.id,
      lot_id: lot.id,
      status: "pending_payment",
      amount: Number(lot.price),
      commission: commissionCents / 100,
      stripe_checkout_session_id: session.id,
    });

    return new Response(JSON.stringify({ sessionId: session.id, url: session.url }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("create-checkout-session error:", err);
    return new Response(JSON.stringify({ error: "Internal error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
