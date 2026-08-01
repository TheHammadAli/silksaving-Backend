import { getStripeSync, getUncachableStripeClient } from './stripeClient';
import { sendOrderEmails, type OrderDetails } from './emailService';
import { logger } from './lib/logger';

export class WebhookHandlers {
  static async processWebhook(payload: Buffer, signature: string): Promise<void> {
    if (!Buffer.isBuffer(payload)) {
      throw new Error(
        'STRIPE WEBHOOK ERROR: Payload must be a Buffer. ' +
        'Received type: ' + typeof payload + '. ' +
        'FIX: Ensure webhook route is registered BEFORE app.use(express.json()).'
      );
    }

    // Run email triggers alongside stripe-replit-sync processing
    await Promise.all([
      WebhookHandlers._handleEmailTriggers(payload),
      getStripeSync().then(sync => sync.processWebhook(payload, signature)),
    ]);
  }

  private static async _handleEmailTriggers(payload: Buffer): Promise<void> {
    try {
      let event: any;
      try {
        event = JSON.parse(payload.toString('utf8'));
      } catch {
        return;
      }

      if (event.type === 'checkout.session.completed') {
        await WebhookHandlers._onCheckoutComplete(event.data.object);
      }
    } catch (err) {
      // Never let email failure break webhook processing
      logger.error({ err }, 'Email trigger error in webhook handler');
    }
  }

  private static async _onCheckoutComplete(session: any): Promise<void> {
    const customerEmail =
      session.customer_details?.email ?? session.customer_email ?? null;

    if (!customerEmail) {
      logger.warn({ sessionId: session.id }, 'checkout.session.completed has no customer email — skipping emails');
      return;
    }

    // Try to get a human-readable product name by expanding line items
    let productName: string = session.metadata?.productHandle ?? 'Your order';
    try {
      const stripe = await getUncachableStripeClient();
      const expanded = await stripe.checkout.sessions.retrieve(session.id, {
        expand: ['line_items'],
      });
      const firstItem = expanded.line_items?.data?.[0];
      if (firstItem?.description) {
        productName = firstItem.description;
      } else if (firstItem?.price?.product && typeof firstItem.price.product === 'object') {
        productName = (firstItem.price.product as any).name ?? productName;
      }
    } catch (err) {
      logger.warn({ err }, 'Could not expand line items — using metadata product name');
    }

    const order: OrderDetails = {
      orderId: session.id,
      customerEmail,
      customerName: session.customer_details?.name ?? '',
      customerPhone: session.customer_details?.phone ?? undefined,
      productName,
      amount: session.amount_total ?? 0,
      currency: session.currency ?? 'usd',
      shippingAddress:
        session.shipping_details?.address ??
        session.customer_details?.address ??
        null,
    };

    logger.info({ orderId: order.orderId, customerEmail }, 'Sending order confirmation emails');
    await sendOrderEmails(order);
  }
}
