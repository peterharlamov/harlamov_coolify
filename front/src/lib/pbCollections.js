const config = {
  USERS_COLLECTION: import.meta.env.VITE_PB_USERS_COLLECTION || 'users',
  WORKSPACES_COLLECTION: import.meta.env.VITE_PB_WORKSPACES_COLLECTION || 'workspaces',
  DEVICES_COLLECTION: import.meta.env.VITE_PB_DEVICES_COLLECTION || 'devices',
  DEVICE_NOTES_COLLECTION: import.meta.env.VITE_PB_DEVICE_NOTES_COLLECTION || 'device_notes',
};

export const PB_COLLECTIONS = Object.freeze(config);
