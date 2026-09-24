import { SQLiteAdapter, SQLiteResultSet } from './adapter';
import { NitroSQLite, open } from 'react-native-nitro-sqlite';

const DB_NAME = 'research_pal_sync.db';
const DB_LOCATION = 'default';

let adapterPromise: Promise<SQLiteAdapter> | null = null;

const toResultSet = (result: {
  rows: {
    length: number;
    item: (index: number) => Record<string, unknown> | undefined;
  };
  rowsAffected?: number;
  insertId?: number;
}): SQLiteResultSet => {
  return {
    rows: {
      length: result.rows.length,
      item: index => result.rows.item(index) || {},
    },
    rowsAffected: result.rowsAffected || 0,
    insertId: result.insertId,
  };
};

export const createReactNativeSQLiteAdapter = async (): Promise<SQLiteAdapter> => {
  if (adapterPromise) {
    return adapterPromise;
  }

  adapterPromise = Promise.resolve().then(() => {
    try {
      const db = open({
        name: DB_NAME,
        location: DB_LOCATION,
      });

      return {
        executeSql: async (sql, params = []) => {
          const result = await db.executeAsync(sql, params);
          return toResultSet(result);
        },
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      if (!message.includes('already open')) {
        throw error;
      }

      return {
        executeSql: async (sql, params = []) => {
          const result = await NitroSQLite.executeAsync(DB_NAME, sql, params);
          return toResultSet(result);
        },
      };
    }
  });

  return adapterPromise;
};
