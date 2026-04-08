import { pb } from './pocketbase';
import { listDevices } from './devices';

const collection = pb.collection('workspaces');

export function getCurrentWorkspaceId() {
  return pb.authStore.record?.workspace || '';
}

export function getWorkspaceById(id) {
  return collection.getOne(id);
}

export async function getWorkspaceSummary(workspaceId) {
  if (!workspaceId) {
    throw new Error('Current user is not attached to a workspace.');
  }

  const [workspace, devices] = await Promise.all([
    getWorkspaceById(workspaceId),
    listDevices({ workspaceId, page: 1, perPage: 1 }),
  ]);

  const status = workspace.subscription_status || 'inactive';
  const isUnlimited = status === 'active' || status === 'trialing';
  const limit = isUnlimited ? null : workspace.device_limit || 10;

  return {
    workspace,
    status,
    isUnlimited,
    usedDevices: devices.totalItems,
    limit,
  };
}
