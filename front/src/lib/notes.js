import { pb } from './pocketbase';

const collection = pb.collection('device_notes');

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
