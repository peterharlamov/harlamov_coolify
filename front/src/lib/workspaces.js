import { pb } from './pocketbase';
import { listDevices } from './devices';

const DEFAULT_WORKSPACE_NAME = 'Office Device Inventory';
const WORKSPACE_COLLECTION_CANDIDATES = ['workspaces', 'workspace'];

let cachedWorkspaceCollectionName = '';

function normalizeRelationId(value) {
  if (Array.isArray(value)) {
    return value[0] || '';
  }

  return typeof value === 'string' ? value : '';
}

function isNotFound(error) {
  return error?.status === 404 || String(error?.message || '').toLowerCase().includes('missing or invalid collection context');
}

function collectionExistsWithRestrictedRules(error) {
  return error?.status === 401 || error?.status === 403;
}

async function getWorkspaceCollection() {
  if (cachedWorkspaceCollectionName) {
    return pb.collection(cachedWorkspaceCollectionName);
  }

  for (const candidate of WORKSPACE_COLLECTION_CANDIDATES) {
    try {
      await pb.collection(candidate).getList(1, 1);
      cachedWorkspaceCollectionName = candidate;
      return pb.collection(candidate);
    } catch (error) {
      if (collectionExistsWithRestrictedRules(error)) {
        cachedWorkspaceCollectionName = candidate;
        return pb.collection(candidate);
      }

      if (!isNotFound(error)) {
        throw error;
      }
    }
  }

  throw new Error('Workspace collection not found. Expected "workspaces" (or fallback "workspace").');
}

async function findOwnedWorkspace(ownerId) {
  const collection = await getWorkspaceCollection();

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
  const workspaceId = normalizeRelationId(user.workspace);

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
    const collection = await getWorkspaceCollection();

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
  return normalizeRelationId(pb.authStore.record?.workspace);
}

export async function getWorkspaceById(id) {
  const collection = await getWorkspaceCollection();
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
