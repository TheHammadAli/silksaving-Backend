import { Router } from "express";
import { Resend } from "resend";
import { logger } from "../lib/logger";

const router = Router();

function isValidContact(body: unknown): body is { name: string; email: string; subject: string; message: string } {
  if (!body || typeof body !== "object") return false;
  const b = body as Record<string, unknown>;
  return (
    typeof b.name === "string" && b.name.trim().length > 0 &&
    typeof b.email === "string" && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(b.email) &&
    typeof b.subject === "string" && b.subject.trim().length > 0 &&
    typeof b.message === "string" && b.message.trim().length > 0
  );
}

const ADMIN_EMAIL = "support@leadscollab.uk";
const FROM_EMAIL = "Silk Savings <orders@silksavings.shop>";

function adminHtml(name: string, email: string, subject: string, message: string) {
  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"/><title>New Contact Form Submission</title></head>
<body style="margin:0;padding:0;background:#f0f0f0;font-family:sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f0f0f0;padding:32px 16px;">
    <tr><td align="center">
      <table width="560" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px;overflow:hidden;max-width:560px;width:100%;">
        <tr>
          <td style="background:#1e3a22;padding:24px 32px;">
            <div style="color:#c9a227;font-size:11px;letter-spacing:3px;text-transform:uppercase;">Silk Savings® — Contact Alert</div>
            <div style="color:#ffffff;font-size:22px;font-weight:700;margin-top:6px;">✉️ New Contact Form Message</div>
          </td>
        </tr>
        <tr>
          <td style="padding:32px;">
            <table width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #e0e0e0;border-radius:8px;overflow:hidden;">
              <tr style="background:#f8f8f8;">
                <td style="padding:10px 16px;font-size:12px;font-weight:600;color:#666;text-transform:uppercase;letter-spacing:1px;border-bottom:1px solid #e0e0e0;">Field</td>
                <td style="padding:10px 16px;font-size:12px;font-weight:600;color:#666;text-transform:uppercase;letter-spacing:1px;border-bottom:1px solid #e0e0e0;">Value</td>
              </tr>
              ${[
                ["From", name],
                ["Email", email],
                ["Subject", subject],
              ].map(([label, value]) => `
              <tr>
                <td style="padding:10px 16px;font-size:13px;color:#888;border-bottom:1px solid #f0f0f0;white-space:nowrap;">${label}</td>
                <td style="padding:10px 16px;font-size:13px;color:#222;border-bottom:1px solid #f0f0f0;font-weight:500;">${value}</td>
              </tr>`).join("")}
              <tr>
                <td style="padding:10px 16px;font-size:13px;color:#888;vertical-align:top;white-space:nowrap;">Message</td>
                <td style="padding:10px 16px;font-size:13px;color:#222;font-weight:500;white-space:pre-wrap;line-height:1.6;">${message.replace(/</g, "&lt;").replace(/>/g, "&gt;")}</td>
              </tr>
            </table>
            <p style="color:#888;font-size:12px;margin:20px 0 0;">Sent automatically via Silk Savings contact form.</p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

function customerHtml(name: string, subject: string) {
  const firstName = name.split(" ")[0] || "there";
  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"/><meta name="viewport" content="width=device-width,initial-scale=1.0"/><title>We received your message</title></head>
<body style="margin:0;padding:0;background:#f5f5f0;font-family:sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f5f5f0;padding:40px 16px;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:16px;overflow:hidden;max-width:600px;width:100%;">
        <tr>
          <td style="background:#1e3a22;padding:32px 40px;text-align:center;">
            <div style="color:#c9a227;font-size:12px;letter-spacing:4px;text-transform:uppercase;margin-bottom:8px;">Silk Savings®</div>
            <div style="color:#ffffff;font-size:24px;font-weight:700;">Message Received!</div>
            <div style="color:#a8c5ac;font-size:14px;margin-top:6px;">We'll be in touch shortly</div>
          </td>
        </tr>
        <tr>
          <td style="padding:40px;">
            <p style="color:#1e3a22;font-size:16px;margin:0 0 16px;">Hi ${firstName},</p>
            <p style="color:#555;font-size:14px;line-height:1.7;margin:0 0 24px;">
              Thank you for reaching out to us regarding <strong>"${subject}"</strong>. We've received your message and our team will get back to you within <strong>24–48 business hours</strong>.
            </p>
            <div style="background:#f9f7f2;border:1px solid #e8e0d0;border-radius:12px;padding:20px 24px;margin-bottom:28px;">
              <div style="font-size:12px;color:#c9a227;letter-spacing:3px;text-transform:uppercase;margin-bottom:12px;">In the meantime</div>
              <ul style="margin:0;padding:0 0 0 18px;color:#555;font-size:14px;line-height:2;">
                <li>Browse our <a href="https://www.silksavings.shop/products" style="color:#2c5530;">full product range</a></li>
                <li>Check our <a href="https://www.silksavings.shop/returns" style="color:#2c5530;">Returns &amp; Refund policy</a></li>
                <li>For urgent matters call us: <a href="tel:3072438254" style="color:#2c5530;">307-243-8254</a></li>
              </ul>
            </div>
            <p style="color:#888;font-size:13px;line-height:1.6;margin:0;">
              If you didn't submit this form, please ignore this email or contact us at <a href="mailto:support@leadscollab.uk" style="color:#2c5530;">support@leadscollab.uk</a>.
            </p>
          </td>
        </tr>
        <tr>
          <td style="background:#f9f7f2;padding:24px 40px;text-align:center;border-top:1px solid #ede8dd;">
            <p style="color:#888;font-size:12px;margin:0;">© ${new Date().getFullYear()} leadscollaborate LLC. Silk Savings® is a registered trademark.</p>
            <p style="color:#aaa;font-size:11px;margin:8px 0 0;">100% Pure &amp; Organic | silksavings.shop</p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

router.post("/contact", async (req, res) => {
  if (!isValidContact(req.body)) {
    res.status(400).json({ error: "Invalid form data" });
    return;
  }

  const { name, email, subject, message } = req.body;

  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    req.log.error("RESEND_API_KEY not set");
    res.status(500).json({ error: "Email service not configured" });
    return;
  }

  const resend = new Resend(apiKey);

  const [adminResult, customerResult] = await Promise.allSettled([
    resend.emails.send({
      from: FROM_EMAIL,
      to: ADMIN_EMAIL,
      replyTo: email,
      subject: `[Contact Form] ${subject} — from ${name}`,
      html: adminHtml(name, email, subject, message),
    }),
    resend.emails.send({
      from: FROM_EMAIL,
      to: email,
      subject: `We received your message — Silk Savings®`,
      html: customerHtml(name, subject),
    }),
  ]);

  if (adminResult.status === "rejected") {
    req.log.error({ err: adminResult.reason }, "Failed to send admin contact email");
  } else {
    req.log.info({ to: ADMIN_EMAIL }, "Contact admin email sent");
  }

  if (customerResult.status === "rejected") {
    req.log.error({ err: customerResult.reason }, "Failed to send customer contact email");
  } else {
    req.log.info({ to: email }, "Contact confirmation email sent");
  }

  if (adminResult.status === "rejected" && customerResult.status === "rejected") {
    res.status(500).json({ error: "Failed to send emails" });
    return;
  }

  res.json({ ok: true });
});

export default router;
