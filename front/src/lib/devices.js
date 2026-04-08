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

export function listLegacyDevicesWithoutWorkspace({ page = 1, perPage = 200 } = {}) {
  return collection.getList(page, perPage, {
    sort: '-created',
    filter: 'workspace = ""',
  });
}

export async function migrateLegacyDevicesToWorkspace(workspaceId) {
  const response = await listLegacyDevicesWithoutWorkspace({ page: 1, perPage: 500 });

  await Promise.all(
    response.items.map((device) =>
      collection.update(device.id, {
        workspace: workspaceId,
      })
    )
  );

  return response.items.length;
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
