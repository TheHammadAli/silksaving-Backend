import { Router } from "express";
import { Resend } from "resend";
import { logger } from "../lib/logger";

const router = Router();

const ADMIN_EMAIL = "support@leadscollab.uk";
const FROM_EMAIL = "Silk Savings <orders@silksavings.shop>";

router.post("/chat-lead", async (req, res) => {
  const { name, contact, interest } = req.body ?? {};

  if (!name || !contact) {
    res.status(400).json({ error: "name and contact are required" });
    return;
  }

  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    req.log.error("RESEND_API_KEY not set — lead not emailed");
    res.json({ ok: true }); // still return ok so chat doesn't break
    return;
  }

  const resend = new Resend(apiKey);

  const html = `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"/><title>New Chat Lead</title></head>
<body style="margin:0;padding:0;background:#f0f0f0;font-family:sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f0f0f0;padding:32px 16px;">
    <tr><td align="center">
      <table width="520" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px;overflow:hidden;max-width:520px;width:100%;">
        <tr>
          <td style="background:#1e3a22;padding:24px 32px;">
            <div style="color:#c9a227;font-size:11px;letter-spacing:3px;text-transform:uppercase;">Silk Savings® — Chatbot Lead</div>
            <div style="color:#ffffff;font-size:22px;font-weight:700;margin-top:6px;">💬 New Lead from Chat Widget</div>
          </td>
        </tr>
        <tr>
          <td style="padding:28px 32px;">
            <table width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #e0e0e0;border-radius:8px;overflow:hidden;">
              <tr style="background:#f8f8f8;">
                <td style="padding:10px 16px;font-size:12px;font-weight:600;color:#666;text-transform:uppercase;letter-spacing:1px;border-bottom:1px solid #e0e0e0;">Field</td>
                <td style="padding:10px 16px;font-size:12px;font-weight:600;color:#666;text-transform:uppercase;letter-spacing:1px;border-bottom:1px solid #e0e0e0;">Value</td>
              </tr>
              ${[
                ["Name", name],
                ["WhatsApp / Email", contact],
                ["Interest / Topic", interest || "General inquiry"],
                ["Source", "Chat Widget — silksavings.shop"],
                ["Time", new Date().toLocaleString("en-US", { timeZone: "America/Denver" }) + " MST"],
              ].map(([label, value]) => `
              <tr>
                <td style="padding:10px 16px;font-size:13px;color:#888;border-bottom:1px solid #f0f0f0;white-space:nowrap;">${label}</td>
                <td style="padding:10px 16px;font-size:13px;color:#222;border-bottom:1px solid #f0f0f0;font-weight:500;">${value}</td>
              </tr>`).join("")}
            </table>
            <p style="color:#888;font-size:12px;margin:20px 0 0;">Follow up via WhatsApp or email as soon as possible for best conversion.</p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;

  try {
    await resend.emails.send({
      from: FROM_EMAIL,
      to: ADMIN_EMAIL,
      subject: `💬 New Chat Lead: ${name} — ${contact}`,
      html,
    });
    req.log.info({ name, contact }, "Chat lead email sent");
  } catch (err) {
    req.log.error({ err }, "Failed to send chat lead email");
  }

  res.json({ ok: true });
});

export default router;
