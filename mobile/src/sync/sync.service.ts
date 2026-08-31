import api from '../services/api';
import { recordSyncConflict } from './conflicts/conflicts.repository';
import {
  getPendingOutboxOperations,
  markOutboxOperationConflict,
  markOutboxOperationDone,
  markOutboxOperationFailed,
} from './outbox/outbox.repository';
import { getSyncState, setSyncState } from './state/syncState.repository';

const LAST_SYNC_CURSOR_KEY = 'last_sync_cursor';

const getDeviceId = async () => {
  const existing = await getSyncState('device_id');
  if (existing) {
    return existing;
  }

  const generated = `device_${Date.now()}_${Math.floor(Math.random() * 1000000)}`;
  await setSyncState('device_id', generated);
  return generated;
};

export const processOutboxPush = async () => {
  const operations = await getPendingOutboxOperations(50);

  if (operations.length === 0) {
    return { pushed: 0, conflicts: 0, failed: 0 };
  }

  const deviceId = await getDeviceId();

  try {
    const response = await api.post(
      '/sync/push',
      {
        operations: operations.map((op) => ({
          opId: op.opId,
          entityType: op.entityType,
          entityId: op.entityId,
          action: op.action,
          payload: op.payload,
          createdAt: op.createdAt,
        })),
      },
      {
        headers: {
          'x-device-id': deviceId,
        },
      },
    );

    const results = response.data?.data?.results || [];
    let conflicts = 0;

    for (const result of results) {
      const opId = String(result.opId);
      if (result.status === 'accepted' || result.status === 'duplicate') {
        await markOutboxOperationDone(opId);
      } else if (result.status === 'conflict') {
        conflicts += 1;
        await markOutboxOperationConflict(opId);
        await recordSyncConflict({
          opId,
          entityType: result.entityType,
          entityId: result.entityId,
          reason: result.reason || 'Server conflict detected',
          localPayload: result.localPayload,
          serverSnapshot: result.serverSnapshot,
        });
      } else {
        await markOutboxOperationFailed(opId);
      }
    }

    return {
      pushed: operations.length,
      conflicts,
      failed: 0,
    };
  } catch {
    for (const operation of operations) {
      await markOutboxOperationFailed(operation.opId);
    }

    return {
      pushed: 0,
      conflicts: 0,
      failed: operations.length,
    };
  }
};

export const pullRemoteChanges = async () => {
  const cursor = (await getSyncState(LAST_SYNC_CURSOR_KEY)) || '0';
  const deviceId = await getDeviceId();

  const response = await api.get('/sync/pull', {
    params: {
      cursor,
      limit: 100,
    },
    headers: {
      'x-device-id': deviceId,
    },
  });

  const data = response.data?.data;
  const nextCursor = String(data?.nextCursor ?? cursor);
  const changes = Array.isArray(data?.changes) ? data.changes : [];

  await setSyncState(LAST_SYNC_CURSOR_KEY, nextCursor);

  return {
    cursor: nextCursor,
    changes,
  };
};
