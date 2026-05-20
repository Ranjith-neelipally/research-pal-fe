import { SQLiteAdapter } from './adapter';
import { SYNC_TABLE_SCHEMAS } from './schema';

let dbAdapter: SQLiteAdapter | null = null;

export const registerSQLiteAdapter = (adapter: SQLiteAdapter) => {
  dbAdapter = adapter;
};

const getAdapter = () => {
  if (!dbAdapter) {
    throw new Error(
      'SQLite adapter is not registered. Register a concrete adapter before using sync storage.',
    );
  }

  return dbAdapter;
};

export const initializeSyncDatabase = async () => {
  const adapter = getAdapter();

  for (const statement of SYNC_TABLE_SCHEMAS) {
    await adapter.executeSql(statement);
  }
};

export const executeSyncSql = async (
  sql: string,
  params: Array<string | number | null> = [],
) => {
  const adapter = getAdapter();
  return adapter.executeSql(sql, params);
};
