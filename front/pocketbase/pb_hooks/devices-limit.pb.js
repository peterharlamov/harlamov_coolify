/// <reference path="../pb_data/types.d.ts" />

onRecordBeforeCreateRequest((e) => {
  if (e.collection.name !== 'devices') {
    return;
  }

  const workspaceId = e.record.getString('workspace');
  if (!workspaceId) {
    throw new BadRequestError('Device must belong to a workspace.');
  }

  const workspace = $app.dao().findRecordById('workspaces', workspaceId);
  if (!workspace) {
    throw new BadRequestError('Workspace not found.');
  }

  const status = workspace.getString('subscription_status');
  const limit = workspace.getInt('device_limit');

  if (status === 'active' || status === 'trialing') {
    return;
  }

  const total = $app.dao()
    .recordQuery('devices')
    .andWhere(dbx.hashExp({ workspace: workspaceId }))
    .count();

  if (limit > 0 && total >= limit) {
    throw new BadRequestError('Free plan allows up to 10 devices. Upgrade to Unlimited to add more.');
  }
}, 'devices');
