import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { sendEmail } from "../_shared/sendEmail.ts";
import { baseLayout, buttonHtml, appUrl } from "../_shared/emailTemplates.ts";
import { hasAnyFilter, isBuyerEligible, type BuyerFilters } from "../_shared/buyerFilters.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const MAX_EMAILS = 50;

// Map French budget strings to a numeric ceiling (€). null → no limit.
const budgetCeiling = (raw: string | null | undefined): number | null => {
  if (!raw) return null;
  const cleaned = raw.toLowerCase().replace(/\s|€|eur/g, "");
  if (cleaned.includes("<1000") || cleaned.includes("moins")) return 1000;
  if (cleaned.includes("1000") && cleaned.includes("5000")) return 5000;
  if (cleaned.includes("5000") && cleaned.includes("15000")) return 15000;
  if (cleaned.includes("15000") && cleaned.includes("50000")) return 50000;
  if (cleaned.includes(">50000") || cleaned.includes("plus")) return null;
  // Fallback: parse last number
  const nums = cleaned.match(/\d+/g);
  if (!nums) return null;
  return parseInt(nums[nums.length - 1]);
};

const matchesCategory = (lotCategory: string | null, buyerCats: string[] | null): boolean => {
  if (!buyerCats || buyerCats.length === 0) return true; // no preference = all
  if (!lotCategory) return false;
  const lc = lotCategory.toLowerCase();
  return buyerCats.some((bc) => lc.includes(bc.toLowerCase()));
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { lotId } = await req.json();
    if (!lotId) {
      return new Response(JSON.stringify({ error: "lotId required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Fetch lot
    const { data: lot, error: lotErr } = await supabase
      .from("lots")
      .select("id, title, brand, category, price, units, location, rating, status, seller_id")
      .eq("id", lotId)
      .single();

    if (lotErr || !lot) {
      return new Response(JSON.stringify({ error: "Lot not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (lot.status !== "active") {
      return new Response(JSON.stringify({ skipped: "not active" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Fetch seller's buyer_filters (so we don't email buyers excluded by the seller).
    const { data: sellerProfile } = await supabase
      .from("profiles")
      .select("user_id")
      .eq("id", lot.seller_id)
      .maybeSingle();
    let sellerFilters: BuyerFilters | null = null;
    if (sellerProfile?.user_id) {
      const { data: sp } = await supabase
        .from("seller_preferences")
        .select("buyer_filters")
        .eq("user_id", sellerProfile.user_id)
        .maybeSingle();
      sellerFilters = (sp?.buyer_filters as BuyerFilters | null) ?? null;
    }
    const enforceSellerFilters = hasAnyFilter(sellerFilters);

    // Fetch eligible buyers (certified + opted-in) — pull all filter fields too.
    const { data: prefs } = await supabase
      .from("buyer_preferences")
      .select("user_id, categories, budget, info_certified, alerts_consent, shipping_country_for_filter, annual_revenue, annual_revenue_range, resale_channels")
      .eq("info_certified", true)
      .eq("alerts_consent", true);

    if (!prefs || prefs.length === 0) {
      return new Response(JSON.stringify({ matched: 0, sent: 0 }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Filter by matching logic
    const lotPrice = Number(lot.price) || 0;
    const matched = prefs.filter((p: any) => {
      if (!matchesCategory(lot.category, p.categories)) return false;
      const ceiling = budgetCeiling(p.budget);
      if (ceiling !== null && lotPrice > ceiling) return false;
      if (enforceSellerFilters && !isBuyerEligible(sellerFilters, p, lot.category)) return false;
      return true;
    }).slice(0, MAX_EMAILS);

    if (matched.length === 0) {
      return new Response(JSON.stringify({ matched: 0, sent: 0 }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Fetch profiles for matched buyers
    const userIds = matched.map((p: any) => p.user_id);
    const { data: profiles } = await supabase
      .from("profiles")
      .select("user_id, email, full_name")
      .in("user_id", userIds);

    if (!profiles) {
      return new Response(JSON.stringify({ matched: matched.length, sent: 0 }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const stars = lot.rating && lot.rating > 0
      ? "★".repeat(Math.round(lot.rating)) + "☆".repeat(5 - Math.round(lot.rating))
      : "";

    let sent = 0;
    for (const profile of profiles) {
      if (!profile.email) continue;
      const firstName = (profile.full_name || "").split(" ")[0] || "";

      const html = baseLayout(`
        <h2 style="color:#5E2B9C;margin:0 0 16px;">Nouveau lot pour vous${firstName ? `, ${firstName}` : ""}</h2>
        <p style="color:#333;font-size:15px;line-height:1.5;">
          Un nouveau lot vient d'être publié et correspond à vos critères d'achat.
        </p>
        <div style="background:#F7F4FB;border-radius:12px;padding:20px;margin:20px 0;">
          <h3 style="color:#5E2B9C;margin:0 0 12px;font-size:18px;">${lot.title}</h3>
          <p style="margin:4px 0;color:#555;font-size:14px;"><strong>Marque :</strong> ${lot.brand || "—"}</p>
          <p style="margin:4px 0;color:#555;font-size:14px;"><strong>Unités :</strong> ${lot.units}</p>
          <p style="margin:4px 0;color:#555;font-size:14px;"><strong>Prix :</strong> ${Number(lot.price).toLocaleString("fr-FR")} €</p>
          ${lot.location ? `<p style="margin:4px 0;color:#555;font-size:14px;"><strong>Origine :</strong> ${lot.location}</p>` : ""}
          ${stars ? `<p style="margin:8px 0 0;color:#D4A017;font-size:16px;">${stars}</p>` : ""}
        </div>
        ${buttonHtml("Voir ce lot", appUrl(`/lot/${lot.id}`))}
        <p style="color:#888;font-size:12px;margin-top:24px;line-height:1.5;">
          Vous recevez cet email car ce lot correspond à vos critères d'achat.
          Gérez vos alertes dans votre profil.
        </p>
      `);

      await sendEmail({
        to: profile.email,
        subject: `Nouveau lot qui pourrait vous intéresser — ${lot.title}`,
        html,
      });
      sent++;
    }

    return new Response(JSON.stringify({ matched: matched.length, sent }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("match-lot-to-buyers error:", e);
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
