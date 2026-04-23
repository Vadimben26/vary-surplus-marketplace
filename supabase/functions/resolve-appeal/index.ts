// Admin-only edge function: process a seller appeal.
// - approve: lift seller suspension, mark appeal as approved.
// - reject : keep suspension, mark appeal as rejected.
// Required secrets: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return json({ error: "Missing authorization" }, 401);
    }

    const supabaseAuth = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );
    const { data: userRes } = await supabaseAuth.auth.getUser();
    const user = userRes?.user;
    if (!user) return json({ error: "Unauthorized" }, 401);

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Verify caller is admin
    const { data: callerProfile } = await supabase
      .from("profiles")
      .select("id, user_type")
      .eq("user_id", user.id)
      .single();
    if (!callerProfile || callerProfile.user_type !== "admin") {
      return json({ error: "Forbidden — admin only" }, 403);
    }

    const { appealId, decision, adminMessage } = await req.json();
    if (!appealId || !["approve", "reject"].includes(decision)) {
      return json({ error: "appealId and decision (approve|reject) required" }, 400);
    }
    if (!adminMessage || String(adminMessage).trim().length < 10) {
      return json({ error: "adminMessage required (min 10 characters)" }, 400);
    }

    const { data: appeal } = await supabase
      .from("seller_appeals")
      .select("id, seller_id, status")
      .eq("id", appealId)
      .single();
    if (!appeal) return json({ error: "Appeal not found" }, 404);
    if (appeal.status !== "pending") {
      return json({ error: "Appeal already processed" }, 400);
    }

    const newStatus = decision === "approve" ? "approved" : "rejected";

    // Update appeal record
    const { error: aErr } = await supabase
      .from("seller_appeals")
      .update({
        status: newStatus,
        admin_decision: String(adminMessage).trim(),
        decided_at: new Date().toISOString(),
        decided_by: callerProfile.id,
      })
      .eq("id", appealId);
    if (aErr) throw aErr;

    // If approved, lift suspension on the seller profile
    if (decision === "approve") {
      const { error: pErr } = await supabase
        .from("profiles")
        .update({ suspended_until: null })
        .eq("id", appeal.seller_id);
      if (pErr) throw pErr;
    }

    return json({ ok: true, status: newStatus });
  } catch (e) {
    console.error("resolve-appeal error:", e);
    return json({ error: String(e) }, 500);
  }
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
