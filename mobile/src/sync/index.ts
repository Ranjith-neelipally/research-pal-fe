import { initializeSyncDatabase, registerSQLiteAdapter } from './sqlite/database';
import { createReactNativeSQLiteAdapter } from './sqlite/reactNativeSQLiteAdapter';

let initialized = false;

export const initializeOfflineSyncFoundation = async () => {
  if (initialized) {
    return;
  }

  const adapter = await createReactNativeSQLiteAdapter();
  registerSQLiteAdapter(adapter);
  await initializeSyncDatabase();
  initialized = true;
};
