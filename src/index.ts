import { runMigrations } from 'stripe-replit-sync';
import { getStripeSync } from "./stripeClient";
import app from "./app";
import { logger } from "./lib/logger";

async function initStripe() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    throw new Error('DATABASE_URL is required. Create a PostgreSQL database first.');
  }

  logger.info('Initializing Stripe schema...');
  await runMigrations({ databaseUrl, schema: 'stripe' });
  logger.info('Stripe schema ready');

  const stripeSync = await getStripeSync();

  const webhookBaseUrl = `https://${process.env.REPLIT_DOMAINS?.split(',')[0]}`;
  const webhookUrl = `${webhookBaseUrl}/api/stripe/webhook`;
  await stripeSync.findOrCreateManagedWebhook(webhookUrl);
  logger.info({ webhookUrl }, 'Stripe webhook configured');

  // Backfill runs in background — don't block server start
  stripeSync.syncBackfill()
    .then(() => logger.info('Stripe data synced'))
    .catch((err) => logger.error({ err }, 'Stripe backfill error'));
}

const rawPort = process.env["PORT"];
if (!rawPort) throw new Error("PORT environment variable is required");
const port = Number(rawPort);
if (Number.isNaN(port) || port <= 0) throw new Error(`Invalid PORT value: "${rawPort}"`);

try {
  await initStripe();
} catch (err) {
  logger.error({ err }, 'Failed to initialize Stripe — server will start without Stripe');
}

app.listen(port, (err) => {
  if (err) { logger.error({ err }, "Error starting server"); process.exit(1); }
  logger.info({ port }, "Server listening");
});
