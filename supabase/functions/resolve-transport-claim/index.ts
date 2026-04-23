// Admin-only edge function: resolve a transport claim with a resolution note.
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
    if (!authHeader) return json({ error: "Missing authorization" }, 401);

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

    const { data: callerProfile } = await supabase
      .from("profiles")
      .select("id, user_type")
      .eq("user_id", user.id)
      .single();
    if (!callerProfile || callerProfile.user_type !== "admin") {
      return json({ error: "Forbidden — admin only" }, 403);
    }

    const { claimId, resolutionNote, claimAmount } = await req.json();
    if (!claimId) return json({ error: "claimId required" }, 400);
    if (!resolutionNote || String(resolutionNote).trim().length < 10) {
      return json({ error: "resolutionNote required (min 10 characters)" }, 400);
    }

    const update: Record<string, unknown> = {
      status: "resolved",
      resolution_note: String(resolutionNote).trim(),
      resolved_at: new Date().toISOString(),
      resolved_by: callerProfile.id,
    };
    if (typeof claimAmount === "number" && Number.isFinite(claimAmount) && claimAmount >= 0) {
      update.claim_amount = claimAmount;
    }

    const { error } = await supabase
      .from("transport_claims")
      .update(update)
      .eq("id", claimId);
    if (error) throw error;

    return json({ ok: true });
  } catch (e) {
    console.error("resolve-transport-claim error:", e);
    return json({ error: String(e) }, 500);
  }
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
