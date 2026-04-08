import cors from 'cors';
import dotenv from 'dotenv';
import express from 'express';
import PocketBase from 'pocketbase';
import Stripe from 'stripe';

dotenv.config();

const app = express();
const PORT = Number(process.env.PORT) || 4000;

const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
const stripeWebhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
const stripePriceId = process.env.STRIPE_PRICE_ID;
const clientUrl = process.env.CLIENT_URL;
const pocketbaseUrl = process.env.POCKETBASE_URL;
const pbAdminEmail = process.env.PB_ADMIN_EMAIL;
const pbAdminPassword = process.env.PB_ADMIN_PASSWORD;
const workspacesCollection = process.env.PB_WORKSPACES_COLLECTION || 'workspaces';

if (!stripeSecretKey || !stripeWebhookSecret || !stripePriceId || !clientUrl || !pocketbaseUrl || !pbAdminEmail || !pbAdminPassword) {
  throw new Error('Missing required backend environment variables.');
}

const stripe = new Stripe(stripeSecretKey);
const pb = new PocketBase(pocketbaseUrl);

pb.autoCancellation(false);

async function ensureAdminAuth() {
  if (pb.authStore.isValid && pb.authStore.model?.email === pbAdminEmail) {
    return;
  }

  await pb.admins.authWithPassword(pbAdminEmail, pbAdminPassword);
}

async function getWorkspace(workspaceId) {
  await ensureAdminAuth();
  return pb.collection(workspacesCollection).getOne(workspaceId);
}

async function updateWorkspace(workspaceId, payload) {
  await ensureAdminAuth();
  return pb.collection(workspacesCollection).update(workspaceId, payload);
}

app.post('/api/stripe/webhook', express.raw({ type: 'application/json' }), async (req, res) => {
  let event;

  try {
    const signature = req.headers['stripe-signature'];
    event = stripe.webhooks.constructEvent(req.body, signature, stripeWebhookSecret);
  } catch (error) {
    res.status(400).send(`Webhook Error: ${error.message}`);
    return;
  }

  try {
    if (event.type === 'checkout.session.completed') {
      const session = event.data.object;
      const workspaceId = session.metadata?.workspaceId;

      if (workspaceId && session.subscription) {
        await updateWorkspace(workspaceId, {
          subscription_status: 'active',
          device_limit: 1000000,
          stripe_customer_id: session.customer || '',
          stripe_subscription_id: session.subscription,
          stripe_price_id: stripePriceId,
        });
      }
    }

    if (event.type === 'customer.subscription.updated' || event.type === 'customer.subscription.deleted') {
      const subscription = event.data.object;
      const workspaceId = subscription.metadata?.workspaceId;

      if (workspaceId) {
        const status = subscription.status;
        const isActiveLike = status === 'active' || status === 'trialing';

        await updateWorkspace(workspaceId, {
          subscription_status: isActiveLike ? status : status === 'past_due' ? 'past_due' : status === 'canceled' ? 'canceled' : 'inactive',
          device_limit: isActiveLike ? 1000000 : 10,
          stripe_customer_id: subscription.customer || '',
          stripe_subscription_id: subscription.id,
          stripe_price_id: subscription.items?.data?.[0]?.price?.id || stripePriceId,
        });
      }
    }

    res.json({ received: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.use(express.json());
app.use(cors({ origin: true }));

app.post('/api/create-subscription-checkout-session', async (req, res) => {
  const { workspaceId, userEmail } = req.body || {};

  if (!workspaceId) {
    res.status(400).json({ error: 'workspaceId is required.' });
    return;
  }

  try {
    const workspace = await getWorkspace(workspaceId);

    let customerId = workspace.stripe_customer_id || '';

    if (!customerId) {
      const customer = await stripe.customers.create({
        email: userEmail || undefined,
        metadata: { workspaceId },
      });

      customerId = customer.id;

      await updateWorkspace(workspaceId, {
        stripe_customer_id: customerId,
      });
    }

    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      customer: customerId,
      payment_method_types: ['card'],
      line_items: [
        {
          price: stripePriceId,
          quantity: 1,
        },
      ],
      success_url: `${clientUrl}/billing?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${clientUrl}/billing?canceled=1`,
      metadata: { workspaceId },
      subscription_data: {
        metadata: { workspaceId },
      },
    });

    res.json({ url: session.url });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.listen(PORT, () => {
  console.log(`Stripe backend listening on port ${PORT}`);
});
