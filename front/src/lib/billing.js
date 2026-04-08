const apiUrl = import.meta.env.VITE_API_URL;

if (!apiUrl) {
  throw new Error('Missing VITE_API_URL. Set it in your .env file.');
}

export async function createSubscriptionCheckoutSession({ workspaceId, userEmail }) {
  const response = await fetch(`${apiUrl}/api/create-subscription-checkout-session`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ workspaceId, userEmail }),
  });

  const payload = await response.json();

  if (!response.ok) {
    throw new Error(payload.error || 'Failed to create checkout session.');
  }

  return payload;
}
