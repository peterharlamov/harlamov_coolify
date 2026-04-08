import { pb } from './pocketbase';

const collection = pb.collection('devices');

export function listDevices({ workspaceId = '', filter = '', sort = '-created', page = 1, perPage = 100 } = {}) {
  const workspaceFilter = workspaceId ? `workspace = "${workspaceId}"` : '';
  const fullFilter = [workspaceFilter, filter].filter(Boolean).join(' && ');

  return collection.getList(page, perPage, {
    sort,
    filter: fullFilter,
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

export function countDevicesByStatus(status, workspaceId = '') {
  const workspaceFilter = workspaceId ? `workspace = "${workspaceId}"` : '';
  const statusFilter = `status = "${status}"`;

  return collection.getList(1, 1, {
    filter: [workspaceFilter, statusFilter].filter(Boolean).join(' && '),
  });
}
