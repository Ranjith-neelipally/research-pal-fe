export type SyncEntityType = 'project' | 'plot' | 'note' | 'idea';

export type SyncAction = 'create' | 'update' | 'delete';

export type SyncStatus = 'synced' | 'pending' | 'conflict' | 'local_only';

export interface SyncPolicy {
  preserveHistory: boolean;
  collapseUpdates: boolean;
  preserveConflicts: boolean;
  hardDelete: boolean;
}

export interface SyncMetadata {
  serverVersion: number;
  lastModifiedByDeviceId: string;
  syncedAt?: string | null;
  createdOfflineAt?: string | null;
  syncStatus: SyncStatus;
}

export interface OutboxOperation {
  opId: string;
  entityType: SyncEntityType;
  entityId: string;
  action: SyncAction;
  payload: Record<string, unknown>;
  retryCount: number;
  status: 'pending' | 'processing' | 'failed' | 'done' | 'conflict';
  createdAt: string;
}
