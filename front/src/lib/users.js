import { pb } from './pocketbase';

const collection = pb.collection('users');

export function listUsers({ page = 1, perPage = 200 } = {}) {
  return collection.getList(page, perPage, {
    sort: '-created',
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
