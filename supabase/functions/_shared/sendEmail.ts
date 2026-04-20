interface EmailPayload {
  to: string;
  subject: string;
  html: string;
}

export async function sendEmail({ to, subject, html }: EmailPayload): Promise<void> {
  const apiKey = Deno.env.get("RESEND_API_KEY");
  if (!apiKey) {
    console.error("RESEND_API_KEY not configured");
    return;
  }
  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: "Vary <noreply@vary-marketplace.fr>",
        to,
        subject,
        html,
      }),
    });
    if (!res.ok) {
      const error = await res.text();
      console.error("Resend error:", error);
    }
  } catch (e) {
    console.error("sendEmail failed:", e);
  }
}
