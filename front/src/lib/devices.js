import { pb } from './pocketbase';

const collection = pb.collection('devices');

export function listDevices({ filter = '', sort = '-created', page = 1, perPage = 100 } = {}) {
  return collection.getList(page, perPage, {
    sort,
    filter,
    expand: 'assigned_to',
  });
}

export function getDeviceById(id) {
  return collection.getOne(id, { expand: 'assigned_to' });
}

export function createDevice(data) {
  return collection.create(data);
}

export function updateDevice(id, data) {
  return collection.update(id, data);
}

export function deleteDevice(id) {
  return collection.delete(id);
}

export function countDevicesByStatus(status) {
  return collection.getList(1, 1, {
    filter: `status = "${status}"`,
  });
}
