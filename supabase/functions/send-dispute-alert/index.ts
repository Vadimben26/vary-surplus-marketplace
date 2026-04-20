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
      .select("id, amount, created_at, lot_id, buyer_id, seller_id")
      .eq("id", orderId)
      .single();

    if (!order) {
      return new Response(JSON.stringify({ error: "Order not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const [{ data: lot }, { data: buyer }, { data: seller }] = await Promise.all([
      supabase.from("lots").select("title").eq("id", order.lot_id).single(),
      supabase.from("profiles").select("full_name, company_name, email").eq("id", order.buyer_id).single(),
      supabase.from("profiles").select("full_name, company_name, email").eq("id", order.seller_id).single(),
    ]);

    // Find admin email
    let adminEmail = Deno.env.get("ADMIN_EMAIL") || "";
    const { data: admins } = await supabase
      .from("profiles")
      .select("email")
      .eq("user_type", "admin")
      .limit(1);
    if (admins && admins.length > 0 && admins[0].email) {
      adminEmail = admins[0].email;
    }

    if (!adminEmail) {
      return new Response(JSON.stringify({ error: "No admin email configured" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const orderShort = order.id.slice(0, 8);

    const html = baseLayout(`
      <h1 style="font-size:22px;margin:0 0 16px;color:#dc2626;">⚠️ Litige ouvert</h1>
      <p style="margin:0 0 16px;">Une commande vient d'être marquée en litige et nécessite une action de votre part.</p>
      <table role="presentation" cellpadding="0" cellspacing="0" style="width:100%;background:#fafafc;border-radius:12px;padding:16px;margin:16px 0;">
        <tr><td style="padding:6px 0;color:#6b6b76;font-size:13px;">N° commande</td><td style="padding:6px 0;font-family:ui-monospace,Menlo,monospace;text-align:right;">${orderShort}</td></tr>
        <tr><td style="padding:6px 0;color:#6b6b76;font-size:13px;">Lot</td><td style="padding:6px 0;font-weight:600;text-align:right;">${lot?.title || ""}</td></tr>
        <tr><td style="padding:6px 0;color:#6b6b76;font-size:13px;">Acheteur</td><td style="padding:6px 0;text-align:right;">${buyer?.company_name || buyer?.full_name || ""}<br/><span style="font-size:12px;color:#8a8a96;">${buyer?.email || ""}</span></td></tr>
        <tr><td style="padding:6px 0;color:#6b6b76;font-size:13px;">Vendeur</td><td style="padding:6px 0;text-align:right;">${seller?.company_name || seller?.full_name || ""}<br/><span style="font-size:12px;color:#8a8a96;">${seller?.email || ""}</span></td></tr>
        <tr><td style="padding:6px 0;color:#6b6b76;font-size:13px;">Montant</td><td style="padding:6px 0;font-weight:700;text-align:right;color:#8B4DCC;">${Number(order.amount).toLocaleString("fr-FR")} €</td></tr>
        <tr><td style="padding:6px 0;color:#6b6b76;font-size:13px;">Créée le</td><td style="padding:6px 0;text-align:right;">${new Date(order.created_at).toLocaleString("fr-FR")}</td></tr>
      </table>
      ${buttonHtml("Traiter le litige", appUrl("/admin/commandes"))}
    `);

    await sendEmail({
      to: adminEmail,
      subject: `⚠️ Litige ouvert — commande ${orderShort}`,
      html,
    });

    return new Response(JSON.stringify({ ok: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("send-dispute-alert error:", e);
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
