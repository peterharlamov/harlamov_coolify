import { pb } from './pocketbase';

const collection = pb.collection('users');

export function listUsers({ page = 1, perPage = 200 } = {}) {
  const role = pb.authStore.record?.role;
  const ownId = pb.authStore.record?.id;

  const filter = role === 'admin' ? '' : ownId ? `id = "${ownId}"` : '';

  return collection.getList(page, perPage, {
    sort: '-created',
    filter,
  });
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
