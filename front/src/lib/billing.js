const apiUrl = import.meta.env.VITE_API_URL;
const hostedPaymentLink =
  import.meta.env.VITE_STRIPE_PAYMENT_LINK || 'https://buy.stripe.com/test_3cI8wP0aGe5ybuVbv1aR201';

if (!apiUrl) {
  throw new Error('Missing VITE_API_URL. Set it in your .env file.');
}

function normalizeApiBaseUrl(url) {
  return String(url).replace(/\/$/, '');
}

export function getHostedPaymentLink({ workspaceId, userEmail }) {
  if (!hostedPaymentLink) {
    return '';
  }

  const url = new URL(hostedPaymentLink);

  if (userEmail) {
    url.searchParams.set('prefilled_email', userEmail);
  }

  if (workspaceId) {
    url.searchParams.set('client_reference_id', workspaceId);
  }

  return url.toString();
}

export function hasHostedPaymentLink() {
  return Boolean(hostedPaymentLink);
}

async function parseApiResponse(response) {
  const contentType = String(response.headers.get('content-type') || '').toLowerCase();
  const rawText = await response.text();

  if (!rawText) {
    return { data: null, rawText: '' };
  }

  if (contentType.includes('application/json')) {
    try {
      return { data: JSON.parse(rawText), rawText };
    } catch {
      return { data: null, rawText };
    }
  }

  try {
    return { data: JSON.parse(rawText), rawText };
  } catch {
    return { data: null, rawText };
  }
}

export async function createSubscriptionCheckoutSession({ workspaceId, userEmail }) {
  let response;

  try {
    response = await fetch(`${normalizeApiBaseUrl(apiUrl)}/api/create-subscription-checkout-session`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ workspaceId, userEmail }),
    });
  } catch (networkError) {
    throw new Error(networkError?.message || 'Network error while contacting billing API.');
  }

  const { data, rawText } = await parseApiResponse(response);

  if (!response.ok) {
    const errorMessage =
      data?.error ||
      (rawText ? rawText.trim() : '') ||
      `Billing API request failed with status ${response.status}.`;
    throw new Error(errorMessage);
  }

  if (!data || typeof data !== 'object') {
    throw new Error('Billing API returned an empty or invalid response.');
  }

  if (typeof data.url !== 'string' || !data.url) {
    throw new Error(data.error || 'Billing API response is missing checkout URL.');
  }

  return data;
}

export async function confirmBillingSession({ sessionId, workspaceId }) {
  let response;

  try {
    response = await fetch(`${normalizeApiBaseUrl(apiUrl)}/api/billing/confirm-session`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ sessionId, workspaceId }),
    });
  } catch (networkError) {
    throw new Error(networkError?.message || 'Network error while confirming billing session.');
  }

  const { data, rawText } = await parseApiResponse(response);

  if (!response.ok) {
    const errorMessage =
      data?.error ||
      (rawText ? rawText.trim() : '') ||
      `Billing confirmation failed with status ${response.status}.`;
    throw new Error(errorMessage);
  }

  return data || {};
}

export async function syncWorkspaceSubscription({ workspaceId, userEmail }) {
  let response;

  try {
    response = await fetch(`${normalizeApiBaseUrl(apiUrl)}/api/billing/sync-workspace-subscription`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ workspaceId, userEmail }),
    });
  } catch (networkError) {
    throw new Error(networkError?.message || 'Network error while syncing workspace subscription.');
  }

  const { data, rawText } = await parseApiResponse(response);

  if (!response.ok) {
    const errorMessage =
      data?.error ||
      (rawText ? rawText.trim() : '') ||
      `Subscription sync failed with status ${response.status}.`;
    throw new Error(errorMessage);
  }

  return data || {};
}

export async function activateWorkspaceSubscription({ workspaceId }) {
  let response;

  try {
    response = await fetch(`${normalizeApiBaseUrl(apiUrl)}/api/billing/activate-workspace`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ workspaceId }),
    });
  } catch (networkError) {
    throw new Error(networkError?.message || 'Network error while activating workspace subscription.');
  }

  const { data, rawText } = await parseApiResponse(response);

  if (!response.ok) {
    const errorMessage =
      data?.error ||
      (rawText ? rawText.trim() : '') ||
      `Workspace activation failed with status ${response.status}.`;
    throw new Error(errorMessage);
  }

  return data || {};
}
