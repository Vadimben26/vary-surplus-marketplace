// supabase/functions/send-contact-message/index.ts
//
// Receives the public Contact/FAQ form submissions and forwards them to
// contact@vary.fr through Resend.
//
// Required secret: RESEND_API_KEY
//
// Public function: no JWT validation (reachable from the marketing pages).
// Basic input validation + rate-limit-friendly: no DB writes.

import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const TARGET = "contact@vary.fr";
// Resend requires a verified domain; until vary.fr is verified we use the
// shared sandbox sender. Same convention as supabase/functions/_shared/sendEmail.ts.
const FROM = "Vary Contact <onboarding@resend.dev>";

const escape = (s: string) =>
  String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/\n/g, "<br/>");

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    const apiKey = Deno.env.get("RESEND_API_KEY");
    if (!apiKey) {
      console.error("RESEND_API_KEY missing");
      return new Response(JSON.stringify({ error: "Email service not configured" }), {
        status: 503,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { name, email, subject, message } = await req.json();

    // Validation
    if (!name || typeof name !== "string" || name.trim().length < 2) {
      return new Response(JSON.stringify({ error: "Nom requis" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (!email || typeof email !== "string" || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
      return new Response(JSON.stringify({ error: "Email invalide" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (!subject || typeof subject !== "string" || subject.trim().length < 2) {
      return new Response(JSON.stringify({ error: "Sujet requis" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (!message || typeof message !== "string" || message.trim().length < 10) {
      return new Response(JSON.stringify({ error: "Message trop court" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (message.length > 5000) {
      return new Response(JSON.stringify({ error: "Message trop long" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const html = `
      <div style="font-family:Inter,Arial,sans-serif;max-width:560px;margin:0 auto;padding:24px;color:#1a1a1a">
        <h2 style="margin:0 0 16px;font-size:18px">Nouveau message — Contact Vary</h2>
        <table style="width:100%;border-collapse:collapse;font-size:14px">
          <tr><td style="padding:6px 0;color:#666">De&nbsp;:</td><td>${escape(name)} &lt;${escape(email)}&gt;</td></tr>
          <tr><td style="padding:6px 0;color:#666">Sujet&nbsp;:</td><td><strong>${escape(subject)}</strong></td></tr>
        </table>
        <hr style="border:none;border-top:1px solid #e5e5e5;margin:16px 0"/>
        <div style="white-space:pre-wrap;font-size:14px;line-height:1.55">${escape(message)}</div>
      </div>
    `;

    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: FROM,
        to: [TARGET],
        reply_to: email,
        subject: `[Contact] ${subject}`,
        html,
      }),
    });

    if (!res.ok) {
      const txt = await res.text();
      console.error("Resend error:", res.status, txt);
      return new Response(JSON.stringify({ error: "Échec d'envoi" }), {
        status: 502,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ ok: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("send-contact-message error:", err);
    return new Response(JSON.stringify({ error: "Internal error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
