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
const usersCollection = process.env.PB_USERS_COLLECTION || 'users';
const defaultWorkspaceName = process.env.DEFAULT_WORKSPACE_NAME || 'Office Device Inventory';

if (!stripeSecretKey || !stripeWebhookSecret || !stripePriceId || !clientUrl || !pocketbaseUrl || !pbAdminEmail || !pbAdminPassword) {
  throw new Error('Missing required backend environment variables.');
}

const stripe = new Stripe(stripeSecretKey);
const pb = new PocketBase(pocketbaseUrl);

pb.autoCancellation(false);

function jsonError(res, status, message, details) {
  res.status(status).json({
    error: message,
    ...(details ? { details } : {}),
  });
}

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

async function findUserByEmail(email) {
  if (!email) {
    return null;
  }

  await ensureAdminAuth();

  try {
    return await pb.collection(usersCollection).getFirstListItem(`email = "${email}"`);
  } catch (error) {
    if (error?.status === 404) {
      return null;
    }

    throw error;
  }
}

async function getDefaultWorkspace() {
  await ensureAdminAuth();

  try {
    return await pb.collection(workspacesCollection).getFirstListItem('id != ""', {
      sort: 'created',
    });
  } catch (error) {
    if (error?.status !== 404) {
      throw error;
    }
  }

  return pb.collection(workspacesCollection).create({
    name: defaultWorkspaceName,
    subscription_status: 'inactive',
    device_limit: 10,
  });
}

async function attachUserToWorkspace(userId, workspaceId) {
  await ensureAdminAuth();
  return pb.collection(usersCollection).update(userId, { workspace: workspaceId });
}

async function resolveWorkspaceIdFromCheckoutSession(session) {
  const fromMetadata = session?.metadata?.workspaceId;
  if (fromMetadata) {
    return fromMetadata;
  }

  const fromClientRef = session?.client_reference_id;
  if (fromClientRef) {
    return fromClientRef;
  }

  const customerEmail = session?.customer_details?.email || session?.customer_email || '';
  const user = await findUserByEmail(customerEmail);

  if (!user) {
    return '';
  }

  if (Array.isArray(user.workspace)) {
    return user.workspace[0] || '';
  }

  return typeof user.workspace === 'string' ? user.workspace : '';
}

async function resolveWorkspaceIdFromSubscription(subscription) {
  const fromMetadata = subscription?.metadata?.workspaceId;
  if (fromMetadata) {
    return fromMetadata;
  }

  const customerId = subscription?.customer || '';

  if (!customerId) {
    return '';
  }

  await ensureAdminAuth();

  try {
    const workspace = await pb.collection(workspacesCollection).getFirstListItem(`stripe_customer_id = "${customerId}"`);
    return workspace.id;
  } catch (error) {
    if (error?.status === 404) {
      return '';
    }

    throw error;
  }
}

app.post('/api/stripe/webhook', express.raw({ type: 'application/json' }), async (req, res) => {
  let event;

  try {
    const signature = req.headers['stripe-signature'];
    event = stripe.webhooks.constructEvent(req.body, signature, stripeWebhookSecret);
  } catch (error) {
    jsonError(res, 400, `Webhook Error: ${error.message}`);
    return;
  }

  try {
    if (event.type === 'checkout.session.completed') {
      const session = event.data.object;
      const workspaceId = await resolveWorkspaceIdFromCheckoutSession(session);

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
      const workspaceId = await resolveWorkspaceIdFromSubscription(subscription);

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
    jsonError(res, 500, error.message || 'Webhook handling failed.');
  }
});

app.use(express.json());
app.use(cors({ origin: true }));

app.post('/api/create-subscription-checkout-session', async (req, res) => {
  const { workspaceId, userEmail } = req.body || {};

  if (!workspaceId) {
    jsonError(res, 400, 'workspaceId is required.');
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

    if (!session?.url) {
      jsonError(res, 502, 'Stripe checkout session did not return a redirect URL.');
      return;
    }

    res.json({ url: session.url });
  } catch (error) {
    jsonError(res, 500, error.message || 'Failed to create subscription checkout session.');
  }
});

app.post('/api/users/attach-workspace', async (req, res) => {
  const { userId } = req.body || {};

  if (!userId) {
    jsonError(res, 400, 'userId is required.');
    return;
  }

  try {
    const workspace = await getDefaultWorkspace();
    await attachUserToWorkspace(userId, workspace.id);

    res.json({
      userId,
      workspaceId: workspace.id,
      workspaceName: workspace.name,
    });
  } catch (error) {
    jsonError(res, 500, error.message || 'Failed to attach user to workspace.');
  }
});

app.use('/api', (_req, res) => {
  jsonError(res, 404, 'API endpoint not found.');
});

app.use((error, _req, res, _next) => {
  if (res.headersSent) {
    return;
  }

  jsonError(res, error?.status || 500, error?.message || 'Internal server error.');
});

app.listen(PORT, () => {
  console.log(`Stripe backend listening on port ${PORT}`);
});
