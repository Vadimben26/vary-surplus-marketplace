import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { sendEmail } from "../_shared/sendEmail.ts";
import { baseLayout, buttonHtml, appUrl } from "../_shared/emailTemplates.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { orderId } = await req.json();
    if (!orderId) {
      return new Response(JSON.stringify({ error: "orderId required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { data: order } = await supabase
      .from("orders")
      .select("id, amount, commission, lot_id, buyer_id, seller_id")
      .eq("id", orderId)
      .single();

    if (!order) {
      return new Response(JSON.stringify({ error: "Order not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const [{ data: lot }, { data: buyer }, { data: seller }] = await Promise.all([
      supabase.from("lots").select("title, units").eq("id", order.lot_id).single(),
      supabase.from("profiles").select("user_id").eq("id", order.buyer_id).single(),
      supabase.from("profiles").select("company_name, email").eq("id", order.seller_id).single(),
    ]);

    let buyerCountry = "—";
    if (buyer?.user_id) {
      const { data: bp } = await supabase
        .from("buyer_preferences")
        .select("country")
        .eq("user_id", buyer.user_id)
        .maybeSingle();
      if (bp?.country) buyerCountry = bp.country;
    }

    if (!seller?.email) {
      return new Response(JSON.stringify({ error: "Seller email missing" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const netPayout = Number(order.amount) - Number(order.commission);

    const html = baseLayout(`
      <h1 style="font-size:22px;margin:0 0 16px;color:#1a1a1f;">Nouvelle commande reçue 📦</h1>
      <p style="margin:0 0 16px;">Bonjour ${seller.company_name || ""},</p>
      <p style="margin:0 0 16px;">Un acheteur vient de commander l'un de vos lots.</p>
      <table role="presentation" cellpadding="0" cellspacing="0" style="width:100%;background:#fafafc;border-radius:12px;padding:16px;margin:16px 0;">
        <tr><td style="padding:6px 0;color:#6b6b76;font-size:13px;">Lot</td><td style="padding:6px 0;font-weight:600;text-align:right;">${lot?.title || ""}</td></tr>
        <tr><td style="padding:6px 0;color:#6b6b76;font-size:13px;">Unités</td><td style="padding:6px 0;font-weight:600;text-align:right;">${lot?.units || 0}</td></tr>
        <tr><td style="padding:6px 0;color:#6b6b76;font-size:13px;">Pays acheteur</td><td style="padding:6px 0;font-weight:600;text-align:right;">${buyerCountry}</td></tr>
        <tr><td style="padding:12px 0 6px;border-top:1px solid #ececf0;font-weight:600;">Votre versement net</td><td style="padding:12px 0 6px;border-top:1px solid #ececf0;font-weight:700;text-align:right;font-size:18px;color:#8B4DCC;">${netPayout.toLocaleString("fr-FR")} €</td></tr>
      </table>
      <div style="background:#fff8e6;border-left:3px solid #d4a017;padding:12px 16px;border-radius:8px;margin:16px 0;font-size:14px;color:#7a5c00;">
        ⏱️ Veuillez expédier sous <strong>5 jours ouvrés</strong> et ajouter le numéro de suivi dans votre tableau de bord.
      </div>
      ${buttonHtml("Gérer mes commandes", appUrl("/seller"))}
    `);

    await sendEmail({
      to: seller.email,
      subject: `Nouvelle commande reçue — ${lot?.title || "Vary"}`,
      html,
    });

    return new Response(JSON.stringify({ ok: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("send-seller-order-notification error:", e);
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
