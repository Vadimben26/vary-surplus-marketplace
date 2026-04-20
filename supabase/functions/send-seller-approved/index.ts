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
    // Auth: must be admin
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const userClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const token = authHeader.replace("Bearer ", "");
    const { data: claims, error: claimsErr } = await userClient.auth.getClaims(token);
    if (claimsErr || !claims?.claims) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Verify caller is admin
    const { data: callerProfile } = await supabase
      .from("profiles")
      .select("id, user_type")
      .eq("user_id", claims.claims.sub)
      .single();

    if (callerProfile?.user_type !== "admin") {
      return new Response(JSON.stringify({ error: "Forbidden" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { sellerUserId } = await req.json();
    if (!sellerUserId) {
      return new Response(JSON.stringify({ error: "sellerUserId required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const now = new Date().toISOString();

    // Update seller_preferences
    const { error: prefErr } = await supabase
      .from("seller_preferences")
      .update({
        validation_status: "approved",
        validated_at: now,
        validated_by: callerProfile.id,
        approval_status: "approved",
        approved_at: now,
      })
      .eq("user_id", sellerUserId);

    if (prefErr) {
      console.error("Update seller_preferences error:", prefErr);
      return new Response(JSON.stringify({ error: prefErr.message }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Fetch seller email
    const { data: seller } = await supabase
      .from("profiles")
      .select("email, full_name, company_name")
      .eq("user_id", sellerUserId)
      .single();

    if (seller?.email) {
      const html = baseLayout(`
        <h1 style="font-size:22px;margin:0 0 16px;color:#1a1a1f;">Bienvenue sur Vary 🎉</h1>
        <p style="margin:0 0 16px;">Bonjour ${seller.company_name || seller.full_name || ""},</p>
        <p style="margin:0 0 16px;">Excellente nouvelle : votre compte vendeur a été <strong>approuvé</strong> par notre équipe.</p>
        <p style="margin:0 0 12px;">Pour démarrer, vous pouvez dès maintenant :</p>
        <ul style="margin:0 0 16px;padding-left:20px;color:#1a1a1f;">
          <li style="margin-bottom:6px;">Compléter votre onboarding Stripe Connect pour recevoir vos paiements</li>
          <li style="margin-bottom:6px;">Publier votre premier lot et toucher des milliers d'acheteurs B2B européens</li>
          <li>Renseigner vos préférences de visibilité pour cibler les bons acheteurs</li>
        </ul>
        ${buttonHtml("Accéder à mon tableau de bord", appUrl("/seller"))}
        <p style="margin:24px 0 0;font-size:13px;color:#6b6b76;">Une question ? Notre équipe est là : <a href="mailto:support@vary-marketplace.fr" style="color:#8B4DCC;text-decoration:none;">support@vary-marketplace.fr</a></p>
      `);

      await sendEmail({
        to: seller.email,
        subject: "Votre compte vendeur Vary est approuvé",
        html,
      });
    }

    return new Response(JSON.stringify({ ok: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("send-seller-approved error:", e);
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
