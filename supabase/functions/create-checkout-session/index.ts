// Required secrets (Supabase Dashboard → Settings → Edge Functions → Secrets):
// - STRIPE_SECRET_KEY (sk_live_... or sk_test_...)
// - SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY (auto)
//
// NOTE: Multi-lot checkout (same seller). Creates ONE Stripe checkout session
// covering all the lots and ONE pending order per lot. Shipping cost is a single
// charge for the whole group; we split it across orders proportionally to each
// lot's price so confirmation/release flows remain per-order.

import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@14?target=deno";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import {
  computeCommission,
  computeStripeFee,
  startOfMonthISO,
} from "../_shared/commission.ts";
import { hasAnyFilter, isBuyerEligible, type BuyerFilters } from "../_shared/buyerFilters.ts";

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
    const lotIdsRaw: string[] = Array.isArray(body?.lotIds)
      ? body.lotIds
      : body?.lotId
        ? [body.lotId]
        : [];
    const shippingCostRaw = Number(body?.shippingCost ?? 0);
    const shippingCost =
      Number.isFinite(shippingCostRaw) && shippingCostRaw >= 0 && shippingCostRaw <= 50000
        ? Math.round(shippingCostRaw * 100) / 100
        : 0;

    if (!lotIdsRaw.length) {
      return new Response(JSON.stringify({ error: "Missing lotId(s)" }), {
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

    // Lots — must all belong to the same seller and be active.
    const { data: lots } = await supabaseAdmin
      .from("lots")
      .select("id, title, price, units, seller_id, status, images, category")
      .in("id", lotIdsRaw);
    if (!lots || lots.length !== lotIdsRaw.length || lots.some((l) => l.status !== "active")) {
      return new Response(JSON.stringify({ error: "One or more lots are not available" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const sellerIds = Array.from(new Set(lots.map((l) => l.seller_id)));
    if (sellerIds.length > 1) {
      return new Response(
        JSON.stringify({ error: "All lots in a single checkout must come from the same seller." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    const sellerProfileId = sellerIds[0];

    const { data: sellerProfile } = await supabaseAdmin
      .from("profiles")
      .select("id, stripe_account_id, email, user_id")
      .eq("id", sellerProfileId)
      .single();

    if (!sellerProfile?.stripe_account_id) {
      return new Response(
        JSON.stringify({ error: "Ce vendeur n'a pas encore configuré son compte de paiement" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // -----------------------------------------------------------------------
    // Buyer eligibility — enforce seller buyer_filters server-side.
    // -----------------------------------------------------------------------
    const { data: sellerPrefs } = await supabaseAdmin
      .from("seller_preferences")
      .select("buyer_filters")
      .eq("user_id", sellerProfile.user_id)
      .maybeSingle();
    const sellerFilters = (sellerPrefs?.buyer_filters as BuyerFilters | null) ?? null;

    if (hasAnyFilter(sellerFilters)) {
      const { data: buyerPrefs } = await supabaseAdmin
        .from("buyer_preferences")
        .select("shipping_country_for_filter, annual_revenue, annual_revenue_range, resale_channels, categories")
        .eq("user_id", user.id)
        .maybeSingle();

      const ineligible = lots.find((l) => !isBuyerEligible(sellerFilters, buyerPrefs ?? null, (l as any).category));
      if (ineligible) {
        return new Response(
          JSON.stringify({ error: "Vous ne correspondez pas aux critères définis par ce vendeur." }),
          { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    // -------------------------------------------------------------------------
    // Commission grid — server-authoritative, computed on the SUM of lot prices.
    // -------------------------------------------------------------------------
    const monthStart = startOfMonthISO();
    const [
      buyerMonthRes,
      sellerMonthRes,
      sellerLifetimeRes,
      buyerLifetimeRes,
    ] = await Promise.all([
      supabaseAdmin.from("orders").select("id", { count: "exact", head: true })
        .eq("buyer_id", buyerProfile.id).in("status", ACTIVE_ORDER_STATUSES).gte("created_at", monthStart),
      supabaseAdmin.from("orders").select("id", { count: "exact", head: true })
        .eq("seller_id", sellerProfile.id).in("status", ACTIVE_ORDER_STATUSES).gte("created_at", monthStart),
      supabaseAdmin.from("orders").select("id", { count: "exact", head: true })
        .eq("seller_id", sellerProfile.id).in("status", ACTIVE_ORDER_STATUSES),
      supabaseAdmin.from("orders").select("id", { count: "exact", head: true })
        .eq("buyer_id", buyerProfile.id).in("status", ACTIVE_ORDER_STATUSES),
    ]);

    const lotsPriceSum = lots.reduce((acc, l) => acc + Number(l.price), 0);
    const commission = computeCommission({
      lotPrice: lotsPriceSum,
      buyerOrderCountThisMonth: buyerMonthRes.count ?? 0,
      sellerSaleCountThisMonth: sellerMonthRes.count ?? 0,
      sellerLifetimeSaleCount: sellerLifetimeRes.count ?? 0,
      isBuyerFirstEverPurchase: (buyerLifetimeRes.count ?? 0) === 0,
    });

    const buyerTotal =
      Math.round((lotsPriceSum + commission.buyerCommission + shippingCost) * 100) / 100;
    const stripeFee = computeStripeFee(buyerTotal);

    const applicationFeeCents = Math.round(
      (commission.buyerCommission + commission.sellerCommission) * 100
    );

    const stripe = new Stripe(STRIPE_SECRET_KEY, { apiVersion: "2023-10-16" });

    // One Stripe line per lot (price + per-lot share of buyer commission), plus
    // a single shipping line for the whole group.
    const lineItems: Stripe.Checkout.SessionCreateParams.LineItem[] = lots.map((lot) => {
      const share = lotsPriceSum > 0 ? Number(lot.price) / lotsPriceSum : 1 / lots.length;
      const buyerComForLot = commission.buyerCommission * share;
      return {
        price_data: {
          currency: "eur",
          product_data: {
            name: lot.title,
            description: `${lot.units} unités — commission acheteur ${(commission.buyerRate * 100).toFixed(1)}% incluse`,
            images: lot.images?.slice(0, 1) || [],
          },
          unit_amount: Math.round((Number(lot.price) + buyerComForLot) * 100),
        },
        quantity: 1,
      };
    });

    if (shippingCost > 0) {
      lineItems.push({
        price_data: {
          currency: "eur",
          product_data: {
            name: lots.length > 1
              ? `Transport groupé (${lots.length} lots)`
              : "Transport (au coût réel)",
          },
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
          lotIds: lots.map((l) => l.id).join(","),
          buyerUserId: user.id,
          sellerProfileId: sellerProfile.id,
          tier: commission.tier,
          buyerRate: String(commission.buyerRate),
          sellerRate: String(commission.sellerRate),
          shippingCost: String(shippingCost),
        },
      },
      metadata: {
        lotIds: lots.map((l) => l.id).join(","),
        buyerUserId: user.id,
        sellerProfileId: sellerProfile.id,
        tier: commission.tier,
      },
      success_url: `${origin}/commandes?payment=success`,
      cancel_url: `${origin}/panier`,
    });

    // Pre-create ONE pending order per lot. Split shipping & commission
    // proportionally to each lot's price so per-order accounting is consistent.
    const orderRows = lots.map((lot) => {
      const share = lotsPriceSum > 0 ? Number(lot.price) / lotsPriceSum : 1 / lots.length;
      const buyerComForLot = commission.buyerCommission * share;
      const sellerComForLot = commission.sellerCommission * share;
      const shippingForLot = shippingCost * share;
      return {
        buyer_id: buyerProfile.id,
        seller_id: sellerProfile.id,
        lot_id: lot.id,
        status: "pending_payment",
        amount: Math.round((Number(lot.price) + buyerComForLot + shippingForLot) * 100) / 100,
        commission: Math.round((buyerComForLot + sellerComForLot) * 100) / 100,
        stripe_checkout_session_id: session.id,
      };
    });
    await supabaseAdmin.from("orders").insert(orderRows);

    return new Response(
      JSON.stringify({
        sessionId: session.id,
        url: session.url,
        breakdown: {
          lotsPriceSum,
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
