const apiUrl = import.meta.env.VITE_API_URL;

if (!apiUrl) {
  throw new Error('Missing VITE_API_URL. Set it in your .env file.');
}

function normalizeApiBaseUrl(url) {
  return String(url).replace(/\/$/, '');
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
