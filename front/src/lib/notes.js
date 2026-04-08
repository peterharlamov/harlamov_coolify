import { pb } from './pocketbase';
import { PB_COLLECTIONS } from './pbCollections';

const collection = pb.collection(PB_COLLECTIONS.DEVICE_NOTES_COLLECTION);

export function listDeviceNotes(deviceId) {
  return collection.getList(1, 200, {
    sort: '-created',
    filter: `device = "${deviceId}"`,
    expand: 'author',
  });
}

export function createDeviceNote(data) {
  return collection.create(data);
}

export function deleteDeviceNote(id) {
  return collection.delete(id);
}
