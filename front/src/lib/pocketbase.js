import PocketBase from 'pocketbase';

const pocketBaseUrl = import.meta.env.VITE_POCKETBASE_URL;

if (!pocketBaseUrl) {
  throw new Error('Missing VITE_POCKETBASE_URL. Set it in your .env file.');
}

export const pb = new PocketBase(pocketBaseUrl);
pb.autoCancellation(false);
