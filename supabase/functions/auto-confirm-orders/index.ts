// Schedule this function daily via Supabase Dashboard → Edge Functions → Schedule, or via pg_cron.
// Required secrets: STRIPE_SECRET_KEY, SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
    const supabaseAdmin = createClient(supabaseUrl, serviceKey);

    const cutoff = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

    const { data: orders } = await supabaseAdmin
      .from("orders")
      .select("id")
      .eq("status", "delivered")
      .lt("delivered_at", cutoff)
      .is("confirmed_at", null);

    let count = 0;
    for (const order of orders || []) {
      try {
        const res = await fetch(`${supabaseUrl}/functions/v1/release-funds`, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${serviceKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ orderId: order.id }),
        });
        if (res.ok) count++;
      } catch (e) {
        console.error(`Auto-confirm failed for order ${order.id}:`, e);
      }
    }

    return new Response(JSON.stringify({ autoConfirmed: count, total: orders?.length || 0 }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("auto-confirm-orders error:", err);
    return new Response(JSON.stringify({ error: "Internal error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
