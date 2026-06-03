import { OutboxOperation, SyncAction, SyncEntityType } from '../types';
import { getSyncPolicy } from '../policies';
import { executeSyncSql } from '../sqlite/database';

const generateOpId = () => {
  return `op_${Date.now()}_${Math.floor(Math.random() * 1000000)}`;
};

const toBooleanNumber = (value: boolean) => (value ? 1 : 0);

const mapRowToOperation = (row: Record<string, unknown>): OutboxOperation => {
  return {
    opId: String(row.op_id),
    entityType: row.entity_type as SyncEntityType,
    entityId: String(row.entity_id),
    action: row.action as SyncAction,
    payload: JSON.parse(String(row.payload_json)),
    retryCount: Number(row.retry_count || 0),
    status: row.status as OutboxOperation['status'],
    createdAt: String(row.created_at),
  };
};

export const enqueueOutboxOperation = async (params: {
  entityType: SyncEntityType;
  entityId: string;
  action: SyncAction;
  payload: Record<string, unknown>;
}) => {
  const { entityType, entityId, action, payload } = params;
  const policy = getSyncPolicy(entityType);
  const opId = generateOpId();
  const createdAt = new Date().toISOString();

  await executeSyncSql(
    `INSERT INTO outbox_ops (
      op_id, entity_type, entity_id, action, payload_json, retry_count, status,
      policy_preserve_history, policy_collapse_updates, policy_preserve_conflicts, policy_hard_delete, created_at
    )
    VALUES (?, ?, ?, ?, ?, 0, 'pending', ?, ?, ?, ?, ?);`,
    [
      opId,
      entityType,
      entityId,
      action,
      JSON.stringify(payload),
      toBooleanNumber(policy.preserveHistory),
      toBooleanNumber(policy.collapseUpdates),
      toBooleanNumber(policy.preserveConflicts),
      toBooleanNumber(policy.hardDelete),
      createdAt,
    ],
  );

  return opId;
};

export const getPendingOutboxOperations = async (limit = 50): Promise<OutboxOperation[]> => {
  const result = await executeSyncSql(
    `SELECT * FROM outbox_ops
     WHERE status IN ('pending', 'failed')
     ORDER BY created_at ASC
     LIMIT ?;`,
    [limit],
  );

  const operations: OutboxOperation[] = [];
  for (let index = 0; index < result.rows.length; index += 1) {
    operations.push(mapRowToOperation(result.rows.item(index)));
  }
  return operations;
};

export const markOutboxOperationDone = async (opId: string) => {
  await executeSyncSql(`UPDATE outbox_ops SET status = 'done' WHERE op_id = ?;`, [opId]);
};

export const markOutboxOperationConflict = async (opId: string) => {
  await executeSyncSql(`UPDATE outbox_ops SET status = 'conflict' WHERE op_id = ?;`, [opId]);
};

export const markOutboxOperationFailed = async (opId: string) => {
  await executeSyncSql(
    `UPDATE outbox_ops
     SET status = 'failed',
         retry_count = retry_count + 1
     WHERE op_id = ?;`,
    [opId],
  );
};

export const collapsePendingUpdatesForEntity = async (
  entityType: SyncEntityType,
  entityId: string,
) => {
  const policy = getSyncPolicy(entityType);

  if (!policy.collapseUpdates) {
    return;
  }

  await executeSyncSql(
    `DELETE FROM outbox_ops
     WHERE op_id IN (
       SELECT op_id FROM outbox_ops
       WHERE entity_type = ?
         AND entity_id = ?
         AND action = 'update'
         AND status = 'pending'
       ORDER BY created_at DESC
       LIMIT -1 OFFSET 1
     );`,
    [entityType, entityId],
  );
};
