import { pb } from './pocketbase';
import { listDevices } from './devices';

const collection = pb.collection('workspaces');
const DEFAULT_WORKSPACE_NAME = 'Office Device Inventory';

function isNotFound(error) {
  return error?.status === 404;
}

async function findOwnedWorkspace(ownerId) {
  try {
    return await collection.getFirstListItem(`owner = "${ownerId}"`);
  } catch (error) {
    if (isNotFound(error)) {
      return null;
    }

    throw error;
  }
}

export async function ensureWorkspaceForCurrentUser(user) {
  if (!user) {
    return null;
  }

  const role = user.role || 'worker';
  const workspaceId = user.workspace || '';

  if (workspaceId) {
    try {
      return await getWorkspaceById(workspaceId);
    } catch (error) {
      if (!isNotFound(error) || role !== 'admin') {
        throw error;
      }
    }
  }

  if (role !== 'admin') {
    return null;
  }

  let workspace = await findOwnedWorkspace(user.id);

  if (!workspace) {
    workspace = await collection.create({
      name: DEFAULT_WORKSPACE_NAME,
      owner: user.id,
      subscription_status: 'inactive',
      device_limit: 10,
    });
  }

  await pb.collection('users').update(user.id, { workspace: workspace.id });

  try {
    await pb.collection('users').authRefresh();
  } catch {
    // authRefresh can fail for stale states; workspace is still attached in DB.
  }

  return workspace;
}

export function getCurrentWorkspaceId() {
  return pb.authStore.record?.workspace || '';
}

export function getWorkspaceById(id) {
  return collection.getOne(id);
}

export async function getWorkspaceSummary(workspaceId) {
  if (!workspaceId) {
    return {
      workspace: null,
      status: 'inactive',
      isUnlimited: false,
      usedDevices: 0,
      limit: 10,
    };
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
