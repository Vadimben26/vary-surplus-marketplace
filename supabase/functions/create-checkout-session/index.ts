// Required secrets (Supabase Dashboard → Settings → Edge Functions → Secrets):
// - STRIPE_SECRET_KEY (sk_live_... or sk_test_...)
// - SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY (auto)
//
// NOTE: STRIPE_PLATFORM_COMMISSION_RATE is no longer used. The commission
// grid lives in supabase/functions/_shared/commission.ts (mirrored from
// src/lib/commission.ts).

import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@14?target=deno";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import {
  computeCommission,
  computeStripeFee,
  startOfMonthISO,
} from "../_shared/commission.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const ACTIVE_ORDER_STATUSES = [
  "paid",
  "preparing",
  "shipped",
  "delivered",
  "confirmed",
];

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

    const body = await req.json().catch(() => ({}));
    const lotId = body?.lotId;
    // Shipping cost is computed client-side from the shipping matrix and the
    // buyer's delivery address. The server trusts a non-negative number ≤ a
    // sane cap (avoids tampering inflating Stripe charges).
    const shippingCostRaw = Number(body?.shippingCost ?? 0);
    const shippingCost =
      Number.isFinite(shippingCostRaw) && shippingCostRaw >= 0 && shippingCostRaw <= 50000
        ? Math.round(shippingCostRaw * 100) / 100
        : 0;

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

    // -------------------------------------------------------------------------
    // Commission grid — server-authoritative computation.
    // Counts must match the client (useCommissionPreview) for UX consistency.
    // -------------------------------------------------------------------------
    const monthStart = startOfMonthISO();

    const [
      buyerMonthRes,
      sellerMonthRes,
      sellerLifetimeRes,
      buyerLifetimeRes,
    ] = await Promise.all([
      supabaseAdmin
        .from("orders")
        .select("id", { count: "exact", head: true })
        .eq("buyer_id", buyerProfile.id)
        .in("status", ACTIVE_ORDER_STATUSES)
        .gte("created_at", monthStart),
      supabaseAdmin
        .from("orders")
        .select("id", { count: "exact", head: true })
        .eq("seller_id", sellerProfile.id)
        .in("status", ACTIVE_ORDER_STATUSES)
        .gte("created_at", monthStart),
      supabaseAdmin
        .from("orders")
        .select("id", { count: "exact", head: true })
        .eq("seller_id", sellerProfile.id)
        .in("status", ACTIVE_ORDER_STATUSES),
      supabaseAdmin
        .from("orders")
        .select("id", { count: "exact", head: true })
        .eq("buyer_id", buyerProfile.id)
        .in("status", ACTIVE_ORDER_STATUSES),
    ]);

    const lotPrice = Number(lot.price);
    const commission = computeCommission({
      lotPrice,
      buyerOrderCountThisMonth: buyerMonthRes.count ?? 0,
      sellerSaleCountThisMonth: sellerMonthRes.count ?? 0,
      sellerLifetimeSaleCount: sellerLifetimeRes.count ?? 0,
      isBuyerFirstEverPurchase: (buyerLifetimeRes.count ?? 0) === 0,
    });

    // Pricing model B: shipping is billed to the buyer at cost, no margin.
    // The buyer pays:  lot price + buyer commission + shipping
    // Vary keeps:      buyer commission + seller commission   (- Stripe fees)
    // Seller receives: lot price - seller commission           (+ shipping passthrough)
    const buyerTotal =
      Math.round((lotPrice + commission.buyerCommission + shippingCost) * 100) / 100;
    const stripeFee = computeStripeFee(buyerTotal);

    // Stripe Connect application_fee_amount is what Vary keeps. Shipping flows
    // through to the seller (handled by including it in the seller's line item
    // and NOT adding it to the application_fee).
    const applicationFeeCents = Math.round(
      (commission.buyerCommission + commission.sellerCommission) * 100
    );

    const stripe = new Stripe(STRIPE_SECRET_KEY, { apiVersion: "2023-10-16" });

    const lineItems: Stripe.Checkout.SessionCreateParams.LineItem[] = [
      {
        price_data: {
          currency: "eur",
          product_data: {
            name: lot.title,
            description: `${lot.units} unités — commission acheteur ${(commission.buyerRate * 100).toFixed(1)}% incluse`,
            images: lot.images?.slice(0, 1) || [],
          },
          // Lot price + buyer commission, charged as a single line.
          unit_amount: Math.round((lotPrice + commission.buyerCommission) * 100),
        },
        quantity: 1,
      },
    ];

    if (shippingCost > 0) {
      lineItems.push({
        price_data: {
          currency: "eur",
          product_data: { name: "Transport (au coût réel)" },
          unit_amount: Math.round(shippingCost * 100),
        },
        quantity: 1,
      });
    }

    const origin = req.headers.get("origin") || "";

    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      payment_method_types: ["card"],
      customer_email: user.email,
      line_items: lineItems,
      payment_intent_data: {
        capture_method: "automatic",
        application_fee_amount: applicationFeeCents,
        transfer_data: { destination: sellerProfile.stripe_account_id },
        metadata: {
          lotId: lot.id,
          buyerUserId: user.id,
          sellerProfileId: sellerProfile.id,
          tier: commission.tier,
          buyerRate: String(commission.buyerRate),
          sellerRate: String(commission.sellerRate),
          shippingCost: String(shippingCost),
        },
      },
      metadata: {
        lotId: lot.id,
        buyerUserId: user.id,
        sellerProfileId: sellerProfile.id,
        tier: commission.tier,
      },
      success_url: `${origin}/commandes?payment=success`,
      cancel_url: `${origin}/panier`,
    });

    // Pre-create pending order (service role bypasses RLS).
    // `amount` = what the buyer pays in total.
    // `commission` = what Vary keeps (gross, before Stripe fees).
    await supabaseAdmin.from("orders").insert({
      buyer_id: buyerProfile.id,
      seller_id: sellerProfile.id,
      lot_id: lot.id,
      status: "pending_payment",
      amount: buyerTotal,
      commission:
        Math.round((commission.buyerCommission + commission.sellerCommission) * 100) / 100,
      stripe_checkout_session_id: session.id,
    });

    return new Response(
      JSON.stringify({
        sessionId: session.id,
        url: session.url,
        breakdown: {
          lotPrice,
          buyerCommission: commission.buyerCommission,
          sellerCommission: commission.sellerCommission,
          shippingCost,
          buyerTotal,
          stripeFee,
          tier: commission.tier,
          tierLabel: commission.tierLabel,
        },
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("create-checkout-session error:", err);
    return new Response(JSON.stringify({ error: "Internal error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
