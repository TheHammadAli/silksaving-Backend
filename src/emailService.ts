import { Resend } from 'resend';
import { logger } from './lib/logger';

function getResendClient() {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) throw new Error('RESEND_API_KEY is not set');
  return new Resend(apiKey);
}

const ADMIN_EMAIL = 'support@leadscollab.uk';
const FROM_EMAIL = 'Silk Savings <orders@silksavings.shop>';

export interface OrderDetails {
  orderId: string;
  customerEmail: string;
  customerName: string;
  customerPhone?: string;
  productName: string;
  amount: number;
  currency: string;
  shippingAddress?: {
    line1?: string | null;
    line2?: string | null;
    city?: string | null;
    state?: string | null;
    postal_code?: string | null;
    country?: string | null;
  } | null;
}

function formatAmount(amount: number, currency: string) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency.toUpperCase(),
  }).format(amount / 100);
}

function formatAddress(addr: OrderDetails['shippingAddress']): string {
  if (!addr) return 'Not provided';
  return [addr.line1, addr.line2, addr.city, addr.state, addr.postal_code, addr.country]
    .filter(Boolean)
    .join(', ');
}

// ─── Customer Confirmation Email ───────────────────────────────────────────

function customerEmailHtml(order: OrderDetails): string {
  const formattedAmount = formatAmount(order.amount, order.currency);
  const address = formatAddress(order.shippingAddress);
  const firstName = order.customerName?.split(' ')[0] || 'Customer';

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <title>Order Confirmation</title>
</head>
<body style="margin:0;padding:0;background:#f5f5f0;font-family:sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f5f5f0;padding:40px 16px;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:16px;overflow:hidden;max-width:600px;width:100%;">

        <!-- Header -->
        <tr>
          <td style="background:#1e3a22;padding:32px 40px;text-align:center;">
            <div style="color:#c9a227;font-size:12px;letter-spacing:4px;text-transform:uppercase;margin-bottom:8px;">Silk Savings®</div>
            <div style="color:#ffffff;font-size:24px;font-weight:700;">Order Confirmed!</div>
            <div style="color:#a8c5ac;font-size:14px;margin-top:6px;">Thank you for your purchase</div>
          </td>
        </tr>

        <!-- Body -->
        <tr>
          <td style="padding:40px;">
            <p style="color:#1e3a22;font-size:16px;margin:0 0 24px;">Hi ${firstName},</p>
            <p style="color:#555;font-size:14px;line-height:1.6;margin:0 0 32px;">
              We've received your order and it's being prepared for shipment. You'll receive a tracking update once your package is on its way.
            </p>

            <!-- Order Summary Box -->
            <div style="background:#f9f7f2;border:1px solid #e8e0d0;border-radius:12px;padding:24px;margin-bottom:32px;">
              <div style="font-size:12px;color:#c9a227;letter-spacing:3px;text-transform:uppercase;margin-bottom:16px;">Order Summary</div>

              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="padding:8px 0;border-bottom:1px solid #ede8dd;">
                    <span style="color:#1e3a22;font-weight:600;font-size:14px;">${order.productName}</span>
                  </td>
                  <td style="padding:8px 0;border-bottom:1px solid #ede8dd;text-align:right;">
                    <span style="color:#1e3a22;font-weight:700;font-size:14px;">${formattedAmount}</span>
                  </td>
                </tr>
                <tr>
                  <td style="padding:12px 0 0;color:#888;font-size:13px;">Order ID</td>
                  <td style="padding:12px 0 0;text-align:right;color:#888;font-size:13px;">${order.orderId}</td>
                </tr>
                <tr>
                  <td style="padding:4px 0;color:#888;font-size:13px;">Shipping to</td>
                  <td style="padding:4px 0;text-align:right;color:#888;font-size:13px;max-width:200px;">${address}</td>
                </tr>
              </table>
            </div>

            <!-- What's Next -->
            <div style="margin-bottom:32px;">
              <div style="font-size:12px;color:#c9a227;letter-spacing:3px;text-transform:uppercase;margin-bottom:16px;">What's Next</div>
              <table cellpadding="0" cellspacing="0">
                <tr>
                  <td style="padding:6px 12px 6px 0;vertical-align:top;color:#2c5530;font-size:18px;">✓</td>
                  <td style="padding:6px 0;color:#555;font-size:14px;line-height:1.5;">Order received &amp; being processed</td>
                </tr>
                <tr>
                  <td style="padding:6px 12px 6px 0;vertical-align:top;color:#ccc;font-size:18px;">○</td>
                  <td style="padding:6px 0;color:#aaa;font-size:14px;line-height:1.5;">Packed &amp; shipped (1-2 business days)</td>
                </tr>
                <tr>
                  <td style="padding:6px 12px 6px 0;vertical-align:top;color:#ccc;font-size:18px;">○</td>
                  <td style="padding:6px 0;color:#aaa;font-size:14px;line-height:1.5;">Tracking info sent to this email</td>
                </tr>
              </table>
            </div>

            <p style="color:#555;font-size:14px;line-height:1.6;margin:0 0 8px;">
              Questions? Reply to this email or contact us at <a href="mailto:support@leadscollab.uk" style="color:#2c5530;">support@leadscollab.uk</a>
            </p>
          </td>
        </tr>

        <!-- Footer -->
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

// ─── Admin Notification Email ───────────────────────────────────────────────

function adminEmailHtml(order: OrderDetails): string {
  const formattedAmount = formatAmount(order.amount, order.currency);
  const address = formatAddress(order.shippingAddress);

  return `
<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8" /><title>New Order</title></head>
<body style="margin:0;padding:0;background:#f0f0f0;font-family:sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f0f0f0;padding:32px 16px;">
    <tr><td align="center">
      <table width="560" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px;overflow:hidden;max-width:560px;width:100%;">

        <tr>
          <td style="background:#1e3a22;padding:24px 32px;">
            <div style="color:#c9a227;font-size:11px;letter-spacing:3px;text-transform:uppercase;">Silk Savings® — Admin Alert</div>
            <div style="color:#ffffff;font-size:22px;font-weight:700;margin-top:6px;">🛍️ New Order Received</div>
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
                ['Order ID', order.orderId],
                ['Product', order.productName],
                ['Amount', formattedAmount],
                ['Customer Name', order.customerName || '—'],
                ['Customer Email', order.customerEmail],
                ['Phone', order.customerPhone || '—'],
                ['Shipping Address', address],
              ].map(([label, value]) => `
              <tr>
                <td style="padding:10px 16px;font-size:13px;color:#888;border-bottom:1px solid #f0f0f0;white-space:nowrap;">${label}</td>
                <td style="padding:10px 16px;font-size:13px;color:#222;border-bottom:1px solid #f0f0f0;font-weight:500;">${value}</td>
              </tr>`).join('')}
            </table>

            <p style="color:#888;font-size:12px;margin:20px 0 0;">Sent automatically by Silk Savings order system.</p>
          </td>
        </tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

// ─── Public Send Functions ──────────────────────────────────────────────────

export async function sendOrderEmails(order: OrderDetails): Promise<void> {
  const resend = getResendClient();

  const formattedAmount = formatAmount(order.amount, order.currency);

  // Send both emails in parallel
  const [customerResult, adminResult] = await Promise.allSettled([
    resend.emails.send({
      from: FROM_EMAIL,
      to: order.customerEmail,
      subject: `Your Silk Savings order is confirmed! (${order.orderId})`,
      html: customerEmailHtml(order),
    }),
    resend.emails.send({
      from: FROM_EMAIL,
      to: ADMIN_EMAIL,
      subject: `New Order: ${order.productName} — ${formattedAmount} (${order.orderId})`,
      html: adminEmailHtml(order),
    }),
  ]);

  if (customerResult.status === 'fulfilled') {
    logger.info({ orderId: order.orderId, to: order.customerEmail }, 'Customer confirmation email sent');
  } else {
    logger.error({ err: customerResult.reason, orderId: order.orderId }, 'Failed to send customer email');
  }

  if (adminResult.status === 'fulfilled') {
    logger.info({ orderId: order.orderId, to: ADMIN_EMAIL }, 'Admin notification email sent');
  } else {
    logger.error({ err: adminResult.reason, orderId: order.orderId }, 'Failed to send admin email');
  }
}
