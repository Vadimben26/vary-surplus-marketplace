// Required secrets (set in Supabase Dashboard → Edge Functions → Secrets):
// - RESEND_API_KEY
// - SUPABASE_URL (auto)
// - SUPABASE_SERVICE_ROLE_KEY (auto)
// - ADMIN_EMAIL (optional fallback for support contact)
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
    const { orderId, outcome, resolutionNote } = await req.json();
    if (!orderId || !outcome) {
      return new Response(JSON.stringify({ error: "orderId and outcome required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );
    const { data: order } = await supabase
      .from("orders")
      .select("id, amount, lot_id, buyer_id")
      .eq("id", orderId).single();
    if (!order) return new Response(JSON.stringify({ error: "Order not found" }), { status: 404, headers: corsHeaders });

    const [{ data: lot }, { data: buyer }] = await Promise.all([
      supabase.from("lots").select("title").eq("id", order.lot_id).single(),
      supabase.from("profiles").select("full_name, company_name, email").eq("id", order.buyer_id).single(),
    ]);
    if (!buyer?.email) return new Response(JSON.stringify({ ok: false, reason: "No buyer email" }), { headers: corsHeaders });

    const isRefund = outcome === "refund";
    const supportEmail = Deno.env.get("ADMIN_EMAIL") || "support@vary.app";
    const greeting = buyer.company_name || buyer.full_name || "Bonjour";
    const orderShort = order.id.slice(0, 8);

    const html = baseLayout(`
      <h1 style="font-size:22px;margin:0 0 16px;color:${isRefund ? "#16a34a" : "#5E2B9C"};">
        ${isRefund ? "Litige résolu — Remboursement validé" : "Litige résolu — Livraison confirmée"}
      </h1>
      <p style="margin:0 0 12px;">${greeting},</p>
      <p style="margin:0 0 16px;">
        ${isRefund
          ? `Suite à l'examen de votre litige sur la commande <strong>${lot?.title || ""}</strong>, notre équipe a validé un remboursement complet de ${Number(order.amount).toLocaleString("fr-FR")} €.`
          : `Suite à l'examen de votre litige sur la commande <strong>${lot?.title || ""}</strong>, notre équipe a confirmé la livraison conforme. Les fonds ont été libérés au vendeur.`}
      </p>
      ${resolutionNote ? `
        <div style="background:#fafafc;border-left:3px solid #8B4DCC;padding:12px 16px;border-radius:8px;margin:16px 0;">
          <p style="margin:0 0 6px;font-size:12px;color:#6b6b76;text-transform:uppercase;letter-spacing:0.5px;font-weight:600;">Note de résolution</p>
          <p style="margin:0;font-size:14px;color:#1a1a1f;">${resolutionNote}</p>
        </div>` : ""}
      <p style="margin:16px 0;font-size:13px;color:#6b6b76;">
        N° commande : <span style="font-family:ui-monospace,Menlo,monospace;">${orderShort}</span>
      </p>
      <p style="margin:0 0 20px;font-size:13px;color:#6b6b76;">
        Pour toute question, contactez-nous à <a href="mailto:${supportEmail}" style="color:#8B4DCC;">${supportEmail}</a>.
      </p>
      ${buttonHtml("Voir mes commandes", appUrl("/commandes"))}
    `);

    await sendEmail({
      to: buyer.email,
      subject: isRefund
        ? `Litige résolu — Remboursement validé (commande ${orderShort})`
        : `Litige résolu — Livraison confirmée (commande ${orderShort})`,
      html,
    });

    return new Response(JSON.stringify({ ok: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("send-dispute-resolved-buyer error:", e);
    return new Response(JSON.stringify({ error: String(e) }), { status: 500, headers: corsHeaders });
  }
});
