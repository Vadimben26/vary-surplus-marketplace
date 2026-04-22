// Submit KYB Verification — analyzes buyer documents with Lovable AI (GPT-5)
// and validates EU VAT number with VIES. Updates buyer_preferences + profiles.buyer_access_level.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface KybRequestBody {
  vat_number?: string | null;
  vat_country_code?: string | null; // e.g. "FR", "DE"
  storefront_url?: string | null;
  document_paths?: string[]; // storage paths inside buyer-kyb-documents bucket
}

interface AiAnalysis {
  business_name: string | null;
  country: string | null;
  vat_number: string | null;
  activity_type: string | null;
  activity_matches_b2b_resale: boolean;
  document_legibility_score: number; // 0-100
  trust_level: "none" | "partial" | "verified";
  rejection_reason: string | null;
}

const SYSTEM_PROMPT = `You are a KYB (Know Your Business) verification analyst for a B2B wholesale marketplace selling surplus stock to professional resellers (boutiques, online resellers including Vinted/TikTok Shop sellers, distributors).

Your job: analyze submitted documents (business registration like KBIS, store photos, websites) plus a VAT number and storefront URL, then return a strict JSON verdict.

Rules:
- "verified" trust_level: at least one clearly legible business document (KBIS, registration, official letter) AND coherent activity (B2B resale, retail, e-commerce, marketplace selling). Score >= 70.
- "partial" trust_level: documents present but partially legible OR activity is plausible but not clearly stated. Score 40-69.
- "none" trust_level: documents missing, illegible, fraudulent-looking, or activity clearly unrelated (e.g. medical, weapons, services unrelated to physical goods resale). Score < 40.
- Individual resellers on platforms like Vinted, TikTok Shop, Wanteed ARE acceptable as B2B resale activity if a storefront link or screenshot proves it.
- Always set activity_matches_b2b_resale=true for fashion/sneakers/accessories resale, retail boutiques, e-commerce stores, marketplace sellers.

Respond ONLY by calling the provided tool with structured fields. No prose.`;

const ANALYSIS_TOOL = {
  type: "function",
  function: {
    name: "submit_kyb_analysis",
    description: "Submit the structured KYB analysis verdict.",
    parameters: {
      type: "object",
      properties: {
        business_name: { type: ["string", "null"] },
        country: { type: ["string", "null"] },
        vat_number: { type: ["string", "null"] },
        activity_type: { type: ["string", "null"] },
        activity_matches_b2b_resale: { type: "boolean" },
        document_legibility_score: { type: "integer", minimum: 0, maximum: 100 },
        trust_level: { type: "string", enum: ["none", "partial", "verified"] },
        rejection_reason: { type: ["string", "null"] },
      },
      required: [
        "activity_matches_b2b_resale",
        "document_legibility_score",
        "trust_level",
      ],
      additionalProperties: false,
    },
  },
};

async function validateVies(
  countryCode: string,
  vatNumber: string,
): Promise<{ valid: boolean; name?: string | null; address?: string | null; error?: string }> {
  try {
    const url = `https://ec.europa.eu/taxation_customs/vies/rest-api/ms/${countryCode}/vat/${vatNumber}`;
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), 5000);
    const r = await fetch(url, { signal: ctrl.signal });
    clearTimeout(t);
    if (!r.ok) return { valid: false, error: `vies http ${r.status}` };
    const data = await r.json();
    return {
      valid: !!data?.isValid,
      name: data?.name ?? null,
      address: data?.address ?? null,
    };
  } catch (e) {
    return { valid: false, error: e instanceof Error ? e.message : "vies error" };
  }
}

function mimeFromPath(path: string): string {
  const ext = path.split(".").pop()?.toLowerCase();
  switch (ext) {
    case "pdf":
      return "application/pdf";
    case "png":
      return "image/png";
    case "webp":
      return "image/webp";
    case "gif":
      return "image/gif";
    case "jpg":
    case "jpeg":
    default:
      return "image/jpeg";
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");

    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    // Auth: identify the user from JWT
    const authHeader = req.headers.get("Authorization") ?? "";
    const userClient = createClient(SUPABASE_URL, ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: userData, error: userErr } = await userClient.auth.getUser();
    if (userErr || !userData?.user) {
      return new Response(JSON.stringify({ error: "unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const userId = userData.user.id;

    const body = (await req.json()) as KybRequestBody;
    const vatNumberRaw = (body.vat_number ?? "").trim().toUpperCase().replace(/\s+/g, "");
    const vatCountry = (body.vat_country_code ?? "").trim().toUpperCase();
    const storefrontUrl = (body.storefront_url ?? "").trim();
    const documentPaths = Array.isArray(body.document_paths) ? body.document_paths : [];

    // Service-role client for storage download + DB updates
    const admin = createClient(SUPABASE_URL, SERVICE_ROLE);

    // Mark as pending immediately
    await admin
      .from("buyer_preferences")
      .update({
        kyb_status: "pending",
        kyb_submitted_at: new Date().toISOString(),
        kyb_documents: documentPaths,
        kyb_vat_number: vatNumberRaw || null,
        kyb_storefront_url: storefrontUrl || null,
        kyb_rejection_reason: null,
      })
      .eq("user_id", userId);

    // 1) VIES validation (best-effort, non-blocking)
    let viesResult: Awaited<ReturnType<typeof validateVies>> | null = null;
    if (vatNumberRaw && vatCountry) {
      // VIES expects the number WITHOUT the country prefix
      const stripped = vatNumberRaw.startsWith(vatCountry)
        ? vatNumberRaw.slice(vatCountry.length)
        : vatNumberRaw;
      viesResult = await validateVies(vatCountry, stripped);
    }

    // 2) Download documents and turn them into base64 data URLs for the AI
    const aiAttachments: { type: "image_url"; image_url: { url: string } }[] = [];
    for (const path of documentPaths.slice(0, 5)) {
      try {
        const { data: file } = await admin.storage
          .from("buyer-kyb-documents")
          .download(path);
        if (!file) continue;
        const buf = new Uint8Array(await file.arrayBuffer());
        // Skip files >6MB to stay within model limits
        if (buf.byteLength > 6 * 1024 * 1024) continue;
        let bin = "";
        for (let i = 0; i < buf.length; i++) bin += String.fromCharCode(buf[i]);
        const b64 = btoa(bin);
        const mime = mimeFromPath(path);
        // PDFs as image_url with data URL are accepted by GPT-5 vision multimodal.
        aiAttachments.push({
          type: "image_url",
          image_url: { url: `data:${mime};base64,${b64}` },
        });
      } catch (e) {
        console.error("download failed", path, e);
      }
    }

    // 3) Call Lovable AI Gateway (GPT-5) with tool calling
    const userText = [
      vatNumberRaw ? `Submitted VAT number: ${vatNumberRaw}` : "No VAT number submitted.",
      viesResult
        ? viesResult.valid
          ? `VIES check: VALID (registered name: ${viesResult.name ?? "n/a"}).`
          : `VIES check: NOT validated (${viesResult.error ?? "not found"}). Treat as inconclusive — the VIES API is sometimes unreachable, do not penalize the buyer for this alone.`
        : "VIES check skipped (no VAT or country provided).",
      storefrontUrl ? `Storefront URL submitted: ${storefrontUrl}` : "No storefront URL submitted.",
      `Number of documents attached: ${aiAttachments.length}.`,
      "Please analyze and return your verdict via the tool.",
    ].join("\n");

    const aiResp = await fetch(
      "https://ai.gateway.lovable.dev/v1/chat/completions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "openai/gpt-5",
          messages: [
            { role: "system", content: SYSTEM_PROMPT },
            {
              role: "user",
              content: [
                { type: "text", text: userText },
                ...aiAttachments,
              ],
            },
          ],
          tools: [ANALYSIS_TOOL],
          tool_choice: { type: "function", function: { name: "submit_kyb_analysis" } },
        }),
      },
    );

    if (!aiResp.ok) {
      const errText = await aiResp.text();
      console.error("AI gateway error", aiResp.status, errText);
      if (aiResp.status === 429) {
        return new Response(
          JSON.stringify({ error: "rate_limited", message: "Trop de demandes — réessayez dans une minute." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }
      if (aiResp.status === 402) {
        return new Response(
          JSON.stringify({ error: "payment_required", message: "Crédits IA épuisés." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }
      throw new Error(`AI gateway ${aiResp.status}`);
    }

    const aiJson = await aiResp.json();
    const toolCall = aiJson?.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall) throw new Error("AI did not return a structured analysis");
    let analysis: AiAnalysis;
    try {
      analysis = JSON.parse(toolCall.function.arguments);
    } catch {
      throw new Error("AI returned invalid JSON arguments");
    }

    // 4) Decide final verdict
    // Verified iff: trust_level === "verified" AND legibility >= 60 AND activity matches.
    // VIES bonus: a valid VIES check can lift "partial" to "verified" if legibility >= 50.
    const viesValid = !!viesResult?.valid;
    let finalLevel: 1 | 2 = 1;
    let finalStatus: "verified" | "rejected" = "rejected";
    let rejectionReason: string | null = analysis.rejection_reason;

    const goodLegibility = analysis.document_legibility_score >= 60;
    const okActivity = analysis.activity_matches_b2b_resale;

    if (analysis.trust_level === "verified" && goodLegibility && okActivity) {
      finalLevel = 2;
      finalStatus = "verified";
      rejectionReason = null;
    } else if (
      analysis.trust_level === "partial" &&
      okActivity &&
      analysis.document_legibility_score >= 50 &&
      viesValid
    ) {
      // VIES validated lifts a partial verdict
      finalLevel = 2;
      finalStatus = "verified";
      rejectionReason = null;
    } else {
      finalLevel = 1;
      finalStatus = "rejected";
      if (!rejectionReason) {
        if (!okActivity) {
          rejectionReason =
            "Activité non identifiée comme revente B2B / commerce de détail. Ajoutez une preuve de votre activité (site marchand, photo de boutique, profil Vinted/TikTok Shop).";
        } else if (!goodLegibility) {
          rejectionReason =
            "Documents peu lisibles. Réessayez avec un scan ou une photo plus nette de votre KBIS / extrait Kbis / registre de commerce.";
        } else {
          rejectionReason =
            "Niveau de confiance insuffisant. Ajoutez un document officiel et/ou un numéro de TVA UE valide.";
        }
      }
    }

    // 5) Persist
    await admin
      .from("buyer_preferences")
      .update({
        kyb_status: finalStatus,
        kyb_trust_score: analysis.document_legibility_score,
        kyb_extracted_data: { ...analysis, vies: viesResult },
        kyb_rejection_reason: rejectionReason,
      })
      .eq("user_id", userId);

    await admin
      .from("profiles")
      .update({ buyer_access_level: finalLevel })
      .eq("user_id", userId);

    return new Response(
      JSON.stringify({
        success: true,
        status: finalStatus,
        access_level: finalLevel,
        trust_score: analysis.document_legibility_score,
        rejection_reason: rejectionReason,
        vies_valid: viesValid,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (e) {
    console.error("submit-kyb-verification error", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "unknown" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
