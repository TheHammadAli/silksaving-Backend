import { Router } from 'express';
import { getUncachableStripeClient } from '../stripeClient';
import { storage } from '../storage';

const router = Router();

// POST /api/checkout — creates a Stripe Checkout Session for a one-time purchase
router.post('/checkout', async (req, res) => {
  try {
    const { productHandle, productName, productPrice, productImage, quantity } = req.body;

    if (!productHandle || !productName || !productPrice) {
      return res.status(400).json({ error: 'productHandle, productName, and productPrice are required' });
    }

    const qty = Math.max(1, Math.round(Number(quantity) || 1));

    const stripe = await getUncachableStripeClient();

    const host = `${req.protocol}://${req.get('host')}`;
    const successUrl = `${host}/?checkout=success&product=${encodeURIComponent(productName)}`;
    const cancelUrl = `${host}/products/${productHandle}`;

    // Look up if the product was already synced from Stripe (seeded via script)
    // If found, use its real price_id for cleaner reporting; otherwise use price_data
    let lineItem: any;

    try {
      const rows = await storage.listProductsWithPrices();
      const match = rows.find((r: any) =>
        r.product_metadata?.handle === productHandle && r.price_id
      );
      if (match) {
        lineItem = { price: match.price_id, quantity: qty };
      }
    } catch (_) {
      // DB not ready yet — fall through to price_data
    }

    if (!lineItem) {
      // Fallback: use price_data (works before seeding)
      lineItem = {
        price_data: {
          currency: 'usd',
          unit_amount: Math.round(Number(productPrice) * 100),
          product_data: {
            name: productName,
            ...(productImage ? { images: [productImage] } : {}),
          },
        },
        quantity: qty,
      };
    }

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [lineItem],
      mode: 'payment',
      success_url: successUrl,
      cancel_url: cancelUrl,
      billing_address_collection: 'required',
      phone_number_collection: { enabled: true },
      shipping_address_collection: {
        allowed_countries: [
          'US', 'CA', 'GB', 'AU', 'NZ', 'IE', 'DE', 'FR', 'ES', 'IT',
          'NL', 'BE', 'SE', 'NO', 'DK', 'FI', 'CH', 'AT', 'PL', 'PT',
          'AE', 'SA', 'PK', 'IN', 'MY', 'SG', 'PH',
        ],
      },
      metadata: { productHandle },
    });

    res.json({ url: session.url });
  } catch (error: any) {
    console.error('Checkout error:', error.message);
    res.status(500).json({ error: error.message || 'Failed to create checkout session' });
  }
});

export default router;
