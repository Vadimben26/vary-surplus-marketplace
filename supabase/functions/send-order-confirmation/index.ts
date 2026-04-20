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
      .select("id, amount, commission, created_at, lot_id, buyer_id, seller_id")
      .eq("id", orderId)
      .single();

    if (!order) {
      return new Response(JSON.stringify({ error: "Order not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const [{ data: lot }, { data: buyer }, { data: seller }] = await Promise.all([
      supabase.from("lots").select("title, brand, units").eq("id", order.lot_id).single(),
      supabase.from("profiles").select("full_name, email").eq("id", order.buyer_id).single(),
      supabase.from("profiles").select("company_name").eq("id", order.seller_id).single(),
    ]);

    if (!buyer?.email) {
      return new Response(JSON.stringify({ error: "Buyer email missing" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const firstName = (buyer.full_name || "").split(" ")[0] || "";
    const greeting = firstName ? `Bonjour ${firstName},` : "Bonjour,";

    const html = baseLayout(`
      <h1 style="font-size:22px;margin:0 0 16px;color:#1a1a1f;">Commande confirmée 🎉</h1>
      <p style="margin:0 0 16px;">${greeting}</p>
      <p style="margin:0 0 16px;">Votre commande a bien été enregistrée et le paiement est sécurisé.</p>
      <table role="presentation" cellpadding="0" cellspacing="0" style="width:100%;background:#fafafc;border-radius:12px;padding:16px;margin:16px 0;">
        <tr><td style="padding:6px 0;color:#6b6b76;font-size:13px;">Lot</td><td style="padding:6px 0;font-weight:600;text-align:right;">${lot?.title || ""}</td></tr>
        <tr><td style="padding:6px 0;color:#6b6b76;font-size:13px;">Marque</td><td style="padding:6px 0;font-weight:600;text-align:right;">${lot?.brand || ""}</td></tr>
        <tr><td style="padding:6px 0;color:#6b6b76;font-size:13px;">Unités</td><td style="padding:6px 0;font-weight:600;text-align:right;">${lot?.units || 0}</td></tr>
        <tr><td style="padding:6px 0;color:#6b6b76;font-size:13px;">Vendeur</td><td style="padding:6px 0;font-weight:600;text-align:right;">${seller?.company_name || ""}</td></tr>
        <tr><td style="padding:12px 0 6px;border-top:1px solid #ececf0;font-weight:600;">Total TTC</td><td style="padding:12px 0 6px;border-top:1px solid #ececf0;font-weight:700;text-align:right;font-size:18px;color:#8B4DCC;">${Number(order.amount).toLocaleString("fr-FR")} €</td></tr>
      </table>
      <div style="background:#f4ecfa;border-left:3px solid #8B4DCC;padding:12px 16px;border-radius:8px;margin:16px 0;font-size:14px;color:#5E2B9C;">
        🔒 Vos fonds sont sécurisés et ne seront versés au vendeur qu'après confirmation de réception.
      </div>
      ${buttonHtml("Voir ma commande", appUrl("/commandes"))}
    `);

    await sendEmail({
      to: buyer.email,
      subject: `Commande confirmée — ${lot?.title || "Vary"}`,
      html,
    });

    return new Response(JSON.stringify({ ok: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("send-order-confirmation error:", e);
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
