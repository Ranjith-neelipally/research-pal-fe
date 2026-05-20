import { SQLiteAdapter, SQLiteResultSet } from './adapter';

type QueryResult = {
  rows: {
    length: number;
    item: (index: number) => Record<string, unknown>;
  };
  rowsAffected: number;
  insertId?: number;
};

const SQLITE_PACKAGE_NAME = 'react-native-sqlite-storage';

const toPromiseResult = (result: QueryResult): SQLiteResultSet => {
  return {
    rows: result.rows,
    rowsAffected: result.rowsAffected,
    insertId: result.insertId,
  };
};

export const createReactNativeSQLiteAdapter = async (): Promise<SQLiteAdapter> => {
  const sqliteModule = require(SQLITE_PACKAGE_NAME) as {
    enablePromise: (enabled: boolean) => void;
    openDatabase: (params: { name: string; location: string }) => Promise<{
      executeSql: (
        sql: string,
        params?: Array<string | number | null>,
      ) => Promise<[QueryResult]>;
    }>;
  };

  sqliteModule.enablePromise(true);

  const db = await sqliteModule.openDatabase({
    name: 'research_pal_sync.db',
    location: 'default',
  });

  return {
    executeSql: async (sql, params = []) => {
      const [result] = await db.executeSql(sql, params);
      return toPromiseResult(result);
    },
  };
};
