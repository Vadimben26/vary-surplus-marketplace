const APP_URL = "https://vary-marketplace.fr";

export function baseLayout(content: string): string {
  return `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
</head>
<body style="margin:0;padding:0;background-color:#f5f5f7;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Arial,sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f5f5f7;padding:32px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.05);">
          <tr>
            <td style="padding:32px 40px 16px;border-bottom:1px solid #ececf0;">
              <div style="font-size:24px;font-weight:700;color:#8B4DCC;letter-spacing:-0.02em;">Vary</div>
              <div style="font-size:13px;color:#6b6b76;margin-top:4px;">Marketplace de déstockage B2B</div>
            </td>
          </tr>
          <tr>
            <td style="padding:32px 40px;color:#1a1a1f;font-size:15px;line-height:1.6;">
              ${content}
            </td>
          </tr>
          <tr>
            <td style="padding:24px 40px;background:#fafafc;border-top:1px solid #ececf0;text-align:center;">
              <p style="margin:0;font-size:12px;color:#8a8a96;">Vary SAS · <a href="${APP_URL}" style="color:#8B4DCC;text-decoration:none;">vary-marketplace.fr</a></p>
              <p style="margin:6px 0 0;font-size:11px;color:#a0a0aa;">Vous recevez cet email car vous êtes inscrit sur Vary.</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

export function buttonHtml(text: string, url: string): string {
  return `<table role="presentation" cellpadding="0" cellspacing="0" style="margin:24px 0;"><tr><td style="border-radius:10px;background:#8B4DCC;"><a href="${url}" style="display:inline-block;padding:12px 24px;color:#ffffff;text-decoration:none;font-weight:600;font-size:14px;border-radius:10px;">${text}</a></td></tr></table>`;
}

export function appUrl(path: string): string {
  return `${APP_URL}${path}`;
}
