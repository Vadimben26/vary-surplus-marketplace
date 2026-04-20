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
      .select("id, tracking_number, lot_id, buyer_id")
      .eq("id", orderId)
      .single();

    if (!order) {
      return new Response(JSON.stringify({ error: "Order not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const [{ data: lot }, { data: buyer }] = await Promise.all([
      supabase.from("lots").select("title").eq("id", order.lot_id).single(),
      supabase.from("profiles").select("full_name, email").eq("id", order.buyer_id).single(),
    ]);

    if (!buyer?.email) {
      return new Response(JSON.stringify({ error: "Buyer email missing" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const firstName = (buyer.full_name || "").split(" ")[0] || "";
    const greeting = firstName ? `Bonjour ${firstName},` : "Bonjour,";

    const trackingBlock = order.tracking_number
      ? `<p style="margin:0 0 16px;">Numéro de suivi : <strong style="font-family:ui-monospace,Menlo,monospace;background:#f4ecfa;padding:3px 8px;border-radius:6px;color:#5E2B9C;">${order.tracking_number}</strong></p>`
      : "";

    const html = baseLayout(`
      <h1 style="font-size:22px;margin:0 0 16px;color:#1a1a1f;">Votre lot est en route 🚚</h1>
      <p style="margin:0 0 16px;">${greeting}</p>
      <p style="margin:0 0 16px;">Bonne nouvelle : votre commande <strong>${lot?.title || ""}</strong> vient d'être expédiée.</p>
      ${trackingBlock}
      <div style="background:#f4ecfa;border-left:3px solid #8B4DCC;padding:12px 16px;border-radius:8px;margin:16px 0;font-size:14px;color:#5E2B9C;">
        ⚠️ N'oubliez pas de <strong>confirmer la réception</strong> dans votre tableau de bord pour libérer le paiement au vendeur.
      </div>
      <p style="margin:0 0 16px;font-size:13px;color:#6b6b76;">Sans action de votre part, les fonds seront automatiquement libérés au vendeur sous <strong>7 jours</strong> après livraison.</p>
      ${buttonHtml("Voir ma commande", appUrl("/commandes"))}
    `);

    await sendEmail({
      to: buyer.email,
      subject: `Votre lot est en route — ${lot?.title || "Vary"}`,
      html,
    });

    return new Response(JSON.stringify({ ok: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("send-shipment-notification error:", e);
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
