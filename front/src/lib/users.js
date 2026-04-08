import { pb } from './pocketbase';
import { devTable } from '../utils/devLogger';
import { PB_COLLECTIONS } from './pbCollections';

const collection = pb.collection(PB_COLLECTIONS.USERS_COLLECTION);

function normalizeString(value) {
  return typeof value === 'string' ? value.trim() : '';
}

export function normalizeUserRecord(record) {
  const email = normalizeString(record?.email);
  const visibility = record?.emailVisibility;

  let emailDisplay = email;
  let emailStatus = 'available';

  if (!email) {
    if (visibility === false) {
      emailDisplay = 'Hidden';
      emailStatus = 'hidden';
    } else {
      emailDisplay = 'Missing in database';
      emailStatus = 'missing';
    }
  }

  return {
    ...record,
    name: normalizeString(record?.name),
    email,
    emailDisplay,
    emailStatus,
    emailVisibility: visibility,
    role: normalizeString(record?.role) || 'worker',
    verified: Boolean(record?.verified),
    created: normalizeString(record?.created) || normalizeString(record?.updated),
  };
}

export async function listUsers({ page = 1, perPage = 200 } = {}) {
  const role = pb.authStore.record?.role;
  const ownId = pb.authStore.record?.id;

  const filter = role === 'admin' ? '' : ownId ? `id = "${ownId}"` : '';

  const response = await collection.getList(page, perPage, {
    sort: '-created',
    filter,
  });

  devTable(
    'users.list raw snapshot',
    (response.items || []).map((record) => ({
      id: record.id,
      name: record.name,
      email: record.email,
      emailVisibility: record.emailVisibility,
      role: record.role,
      verified: record.verified,
      created: record.created,
    }))
  );

  return {
    ...response,
    items: (response.items || []).map(normalizeUserRecord),
  };
}

export function listWorkers({ page = 1, perPage = 200 } = {}) {
  return collection.getList(page, perPage, {
    sort: 'name',
    filter: 'role = "worker"',
  });
}

export function updateUserRole(userId, role) {
  return collection.update(userId, { role });
}
