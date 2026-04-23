// Cron job: J+2 reminder to buyers to rate sellers.
// Triggered by pg_cron (daily). Finds confirmed orders with confirmed_at
// between 36h and 60h ago that have no review yet, then emails the buyer.
// Required secrets: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, RESEND_API_KEY
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
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Window: confirmed between 36h and 60h ago — captures J+2 reminders even
    // if cron runs once per day at any time.
    const now = Date.now();
    const minIso = new Date(now - 60 * 3600 * 1000).toISOString();
    const maxIso = new Date(now - 36 * 3600 * 1000).toISOString();

    const { data: orders, error } = await supabase
      .from("orders")
      .select("id, buyer_id, seller_id, lot_id, confirmed_at")
      .eq("status", "confirmed")
      .gte("confirmed_at", minIso)
      .lte("confirmed_at", maxIso);
    if (error) throw error;
    if (!orders || orders.length === 0) {
      return json({ ok: true, processed: 0 });
    }

    // Skip orders that already have a review.
    const orderIds = orders.map((o: any) => o.id);
    const { data: existingReviews } = await supabase
      .from("reviews")
      .select("order_id")
      .in("order_id", orderIds);
    const reviewedSet = new Set((existingReviews || []).map((r: any) => r.order_id));
    const todo = orders.filter((o: any) => !reviewedSet.has(o.id));
    if (todo.length === 0) return json({ ok: true, processed: 0 });

    const buyerIds = [...new Set(todo.map((o: any) => o.buyer_id))];
    const sellerIds = [...new Set(todo.map((o: any) => o.seller_id))];
    const lotIds = [...new Set(todo.map((o: any) => o.lot_id))];

    const [buyersRes, sellersRes, lotsRes] = await Promise.all([
      supabase.from("profiles").select("id, full_name, company_name, email").in("id", buyerIds),
      supabase.from("profiles").select("id, full_name, company_name").in("id", sellerIds),
      supabase.from("lots").select("id, title").in("id", lotIds),
    ]);
    const buyers = new Map((buyersRes.data || []).map((p: any) => [p.id, p]));
    const sellers = new Map((sellersRes.data || []).map((p: any) => [p.id, p]));
    const lots = new Map((lotsRes.data || []).map((l: any) => [l.id, l]));

    let sent = 0;
    for (const o of todo as any[]) {
      const buyer = buyers.get(o.buyer_id) as any;
      const seller = sellers.get(o.seller_id) as any;
      const lot = lots.get(o.lot_id) as any;
      if (!buyer?.email) continue;

      const greeting = buyer.company_name || buyer.full_name || "Bonjour";
      const sellerName = seller?.company_name || seller?.full_name || "votre vendeur";
      const html = baseLayout(`
        <h1 style="font-size:22px;margin:0 0 16px;color:#5E2B9C;">Notez votre vendeur</h1>
        <p style="margin:0 0 12px;">${greeting},</p>
        <p style="margin:0 0 16px;">
          Votre commande <strong>${lot?.title || ""}</strong> auprès de <strong>${sellerName}</strong>
          est confirmée. Prenez 30 secondes pour partager votre expérience — votre note aide la communauté Vary.
        </p>
        <p style="margin:0 0 12px;font-size:13px;color:#6b6b76;">
          Vous pouvez encore noter pendant 5 jours.
        </p>
        ${buttonHtml("Noter le vendeur", appUrl(`/commandes?rate=${o.id}`))}
      `);

      await sendEmail({
        to: buyer.email,
        subject: `Comment s'est passée votre commande ${lot?.title || ""} ?`,
        html,
      });
      sent += 1;
    }

    return json({ ok: true, processed: sent });
  } catch (e) {
    console.error("send-rating-reminder error:", e);
    return json({ error: String(e) }, 500);
  }
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
