import express, { type Express } from "express";
import cors from "cors";
import pinoHttp from "pino-http";
import router from "./routes";
import { WebhookHandlers } from "./webhookHandlers";
import { logger } from "./lib/logger";

const app: Express = express();

// ── Stripe webhook MUST be registered BEFORE express.json() ──
// Stripe requires the raw Buffer body to verify the signature.
app.post(
  '/api/stripe/webhook',
  express.raw({ type: 'application/json' }),
  async (req, res) => {
    const signature = req.headers['stripe-signature'];
    if (!signature) {
      return res.status(400).json({ error: 'Missing stripe-signature header' });
    }
    try {
      const sig = Array.isArray(signature) ? signature[0] : signature;
      await WebhookHandlers.processWebhook(req.body as Buffer, sig);
      res.status(200).json({ received: true });
    } catch (error: any) {
      logger.error({ err: error }, 'Stripe webhook error');
      res.status(400).json({ error: 'Webhook processing error' });
    }
  }
);

// ── General middleware (after webhook route) ──
app.use(
  pinoHttp({
    logger,
    serializers: {
      req(req) { return { id: req.id, method: req.method, url: req.url?.split("?")[0] }; },
      res(res) { return { statusCode: res.statusCode }; },
    },
  }),
);
app.use(cors({ origin: '*' }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use("/api", router);

// ── Health check — for uptime pingers (UptimeRobot, cron-job.org) to keep the
// free Render instance from spinning down after 15 min of inactivity ──
app.get('/health', (_req, res) => {
  res.status(200).json({ status: 'ok' });
});

// ── Sitemap & robots — served with correct Content-Type ──
app.get('/sitemap.xml', (_req, res) => {
  res.setHeader('Content-Type', 'application/xml; charset=utf-8');
  res.send(`<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url><loc>https://www.silksavings.shop/</loc><changefreq>weekly</changefreq><priority>1.0</priority></url>
  <url><loc>https://www.silksavings.shop/products</loc><changefreq>weekly</changefreq><priority>0.9</priority></url>
  <url><loc>https://www.silksavings.shop/about</loc><changefreq>monthly</changefreq><priority>0.6</priority></url>
  <url><loc>https://www.silksavings.shop/contact</loc><changefreq>monthly</changefreq><priority>0.6</priority></url>
  <url><loc>https://www.silksavings.shop/returns</loc><changefreq>monthly</changefreq><priority>0.3</priority></url>
  <url><loc>https://www.silksavings.shop/privacy</loc><changefreq>monthly</changefreq><priority>0.3</priority></url>
  <url><loc>https://www.silksavings.shop/products/dried-calendula-flowers</loc><changefreq>monthly</changefreq><priority>0.8</priority></url>
  <url><loc>https://www.silksavings.shop/products/bitter-apricot-kernels-8oz</loc><changefreq>monthly</changefreq><priority>0.8</priority></url>
  <url><loc>https://www.silksavings.shop/products/bitter-apricot-kernels-1lb</loc><changefreq>monthly</changefreq><priority>0.8</priority></url>
  <url><loc>https://www.silksavings.shop/products/dried-rose-petals</loc><changefreq>monthly</changefreq><priority>0.8</priority></url>
  <url><loc>https://www.silksavings.shop/products/dried-yarrow-herb</loc><changefreq>monthly</changefreq><priority>0.8</priority></url>
  <url><loc>https://www.silksavings.shop/products/dried-lemon-grass</loc><changefreq>monthly</changefreq><priority>0.8</priority></url>
  <url><loc>https://www.silksavings.shop/products/dried-rue-herb</loc><changefreq>monthly</changefreq><priority>0.8</priority></url>
  <url><loc>https://www.silksavings.shop/products/dried-juniper-berries</loc><changefreq>monthly</changefreq><priority>0.8</priority></url>
  <url><loc>https://www.silksavings.shop/products/wild-sea-buckthorn</loc><changefreq>monthly</changefreq><priority>0.8</priority></url>
  <url><loc>https://www.silksavings.shop/products/dried-senna-leaves</loc><changefreq>monthly</changefreq><priority>0.8</priority></url>
  <url><loc>https://www.silksavings.shop/products/shilajit-resin</loc><changefreq>monthly</changefreq><priority>0.8</priority></url>
</urlset>`);
});

app.get('/robots.txt', (_req, res) => {
  res.setHeader('Content-Type', 'text/plain; charset=utf-8');
  const robots = [
    '# ── All crawlers ────────────────────────────────────────',
    'User-agent: *',
    'Allow: /',
    'Disallow: /api/',
    'Disallow: /cart',
    '',
    '# ── OpenAI / ChatGPT ────────────────────────────────────',
    'User-agent: GPTBot',
    'Allow: /',
    'Disallow: /api/',
    '',
    'User-agent: ChatGPT-User',
    'Allow: /',
    'Disallow: /api/',
    '',
    'User-agent: OAI-SearchBot',
    'Allow: /',
    'Disallow: /api/',
    '',
    '# ── Google Gemini ───────────────────────────────────────',
    'User-agent: Google-Extended',
    'Allow: /',
    'Disallow: /api/',
    '',
    '# ── Anthropic / Claude ──────────────────────────────────',
    'User-agent: anthropic-ai',
    'Allow: /',
    'Disallow: /api/',
    '',
    'User-agent: ClaudeBot',
    'Allow: /',
    'Disallow: /api/',
    '',
    'User-agent: Claude-Web',
    'Allow: /',
    'Disallow: /api/',
    '',
    '# ── Perplexity AI ───────────────────────────────────────',
    'User-agent: PerplexityBot',
    'Allow: /',
    'Disallow: /api/',
    '',
    '# ── Meta AI ─────────────────────────────────────────────',
    'User-agent: FacebookBot',
    'Allow: /',
    'Disallow: /api/',
    '',
    '# ── Apple Intelligence ──────────────────────────────────',
    'User-agent: Applebot-Extended',
    'Allow: /',
    'Disallow: /api/',
    '',
    '# ── Common Crawl ────────────────────────────────────────',
    'User-agent: CCBot',
    'Allow: /',
    'Disallow: /api/',
    '',
    'Sitemap: https://www.silksavings.shop/sitemap.xml',
  ].join('\n');
  res.send(robots);
});

export default app;
