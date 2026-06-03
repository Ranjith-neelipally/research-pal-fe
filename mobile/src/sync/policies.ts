import { SyncEntityType, SyncPolicy } from './types';

export const syncPolicyRegistry: Record<SyncEntityType, SyncPolicy> = {
  project: {
    preserveHistory: false,
    collapseUpdates: true,
    preserveConflicts: false,
    hardDelete: true,
  },
  plot: {
    preserveHistory: false,
    collapseUpdates: true,
    preserveConflicts: false,
    hardDelete: true,
  },
  note: {
    preserveHistory: true,
    collapseUpdates: false,
    preserveConflicts: true,
    hardDelete: true,
  },
  idea: {
    preserveHistory: true,
    collapseUpdates: false,
    preserveConflicts: true,
    hardDelete: true,
  },
};

export const getSyncPolicy = (entityType: SyncEntityType): SyncPolicy => {
  return syncPolicyRegistry[entityType];
};
