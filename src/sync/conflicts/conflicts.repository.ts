import { executeSyncSql } from '../sqlite/database';
import { SyncEntityType } from '../types';

const generateConflictId = () => {
  return `conflict_${Date.now()}_${Math.floor(Math.random() * 1000000)}`;
};

export const recordSyncConflict = async (params: {
  opId: string;
  entityType: SyncEntityType;
  entityId: string;
  reason: string;
  localPayload?: Record<string, unknown>;
  serverSnapshot?: Record<string, unknown>;
}) => {
  const conflictId = generateConflictId();
  const createdAt = new Date().toISOString();

  await executeSyncSql(
    `INSERT INTO sync_conflicts (
      conflict_id, op_id, entity_type, entity_id, reason,
      local_payload_json, server_snapshot_json, resolved, created_at
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, 0, ?);`,
    [
      conflictId,
      params.opId,
      params.entityType,
      params.entityId,
      params.reason,
      params.localPayload ? JSON.stringify(params.localPayload) : null,
      params.serverSnapshot ? JSON.stringify(params.serverSnapshot) : null,
      createdAt,
    ],
  );
};
