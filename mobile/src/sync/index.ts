import { initializeSyncDatabase, registerSQLiteAdapter } from './sqlite/database';
import { createReactNativeSQLiteAdapter } from './sqlite/reactNativeSQLiteAdapter';

let initialized = false;
let initializationPromise: Promise<void> | null = null;

export const initializeOfflineSyncFoundation = async () => {
  if (initialized) {
    return;
  }

  if (!initializationPromise) {
    initializationPromise = (async () => {
      const adapter = await createReactNativeSQLiteAdapter();
      registerSQLiteAdapter(adapter);
      await initializeSyncDatabase();
      initialized = true;
    })().catch(error => {
      initializationPromise = null;
      throw error;
    });
  }

  await initializationPromise;
};
