import { pb } from './pocketbase';
import { listDevices } from './devices';
import { PB_COLLECTIONS } from './pbCollections';

const DEFAULT_WORKSPACE_NAME = 'Office Device Inventory';
export const WORKSPACES_COLLECTION_REQUIRED_MESSAGE =
  "PocketBase collection 'workspaces' is missing. Create it to enable Billing and workspace-based device limits.";

const COLLECTION_STATE = {
  unknown: 'unknown',
  available: 'available',
  missing: 'missing',
};

let workspaceCollectionState = COLLECTION_STATE.unknown;

function normalizeRelationId(value) {
  if (Array.isArray(value)) {
    const first = value[0];

    if (!first) {
      return '';
    }

    if (typeof first === 'object') {
      return typeof first.id === 'string' ? first.id : '';
    }

    return typeof first === 'string' ? first : '';
  }

  return typeof value === 'string' ? value : '';
}

function getExpandedWorkspaceId(expandValue) {
  if (!expandValue) {
    return '';
  }

  if (Array.isArray(expandValue)) {
    return normalizeRelationId(expandValue);
  }

  if (typeof expandValue === 'object') {
    return typeof expandValue.id === 'string' ? expandValue.id : '';
  }

  return '';
}

export function getWorkspaceIdFromUserRecord(user) {
  const directId = normalizeRelationId(user?.workspace);
  if (directId) {
    return directId;
  }

  return getExpandedWorkspaceId(user?.expand?.workspace);
}

function isNotFound(error) {
  return error?.status === 404;
}

function isWorkspaceCollectionMissingError(error) {
  if (error?.status !== 404) {
    return false;
  }

  const message = String(error?.message || '').toLowerCase();
  const data = JSON.stringify(error?.data || {}).toLowerCase();

  return (
    message.includes('missing or invalid collection context') ||
    message.includes('/api/collections/workspaces/records') ||
    data.includes('workspaces')
  );
}

function normalizeWorkspaceSchemaError(error) {
  if (!isWorkspaceCollectionMissingError(error)) {
    return error;
  }

  workspaceCollectionState = COLLECTION_STATE.missing;

  const normalized = new Error(WORKSPACES_COLLECTION_REQUIRED_MESSAGE);
  normalized.cause = error;

  return normalized;
}

async function ensureWorkspacesCollectionAvailable() {
  if (workspaceCollectionState === COLLECTION_STATE.available) {
    return;
  }

  if (workspaceCollectionState === COLLECTION_STATE.missing) {
    throw new Error(WORKSPACES_COLLECTION_REQUIRED_MESSAGE);
  }

  try {
    await pb.collection(PB_COLLECTIONS.WORKSPACES_COLLECTION).getList(1, 1);
    workspaceCollectionState = COLLECTION_STATE.available;
  } catch (error) {
    if (error?.status === 401 || error?.status === 403) {
      workspaceCollectionState = COLLECTION_STATE.available;
      return;
    }

    throw normalizeWorkspaceSchemaError(error);
  }
}

async function getWorkspaceCollection() {
  await ensureWorkspacesCollectionAvailable();
  return pb.collection(PB_COLLECTIONS.WORKSPACES_COLLECTION);
}

async function findOwnedWorkspace(ownerId) {
  const collection = await getWorkspaceCollection();

  try {
    return await collection.getFirstListItem(`owner = "${ownerId}"`);
  } catch (error) {
    const normalizedError = normalizeWorkspaceSchemaError(error);

    if (normalizedError !== error) {
      throw normalizedError;
    }

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
  const workspaceId = getWorkspaceIdFromUserRecord(user);

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

    try {
      workspace = await collection.create({
        name: DEFAULT_WORKSPACE_NAME,
        owner: user.id,
        subscription_status: 'inactive',
        device_limit: 10,
      });
    } catch (error) {
      throw normalizeWorkspaceSchemaError(error);
    }
  }

  await pb.collection(PB_COLLECTIONS.USERS_COLLECTION).update(user.id, { workspace: workspace.id });

  try {
    await pb.collection(PB_COLLECTIONS.USERS_COLLECTION).authRefresh();
  } catch {
    // authRefresh can fail for stale states; workspace is still attached in DB.
  }

  return workspace;
}

export function getCurrentWorkspaceId() {
  return getWorkspaceIdFromUserRecord(pb.authStore.record);
}

export async function getWorkspaceById(id) {
  const collection = await getWorkspaceCollection();

  try {
    return await collection.getOne(id);
  } catch (error) {
    throw normalizeWorkspaceSchemaError(error);
  }
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

export async function activateWorkspaceDirect(workspaceId) {
  if (!workspaceId) {
    throw new Error('workspaceId is required.');
  }

  const collection = await getWorkspaceCollection();

  return collection.update(workspaceId, {
    subscription_status: 'active',
    device_limit: 1000000,
  });
}
