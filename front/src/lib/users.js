import { pb } from './pocketbase';

const collection = pb.collection('users');

function normalizeString(value) {
  return typeof value === 'string' ? value.trim() : '';
}

export function normalizeUserRecord(record) {
  return {
    ...record,
    name: normalizeString(record?.name),
    email: normalizeString(record?.email),
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
