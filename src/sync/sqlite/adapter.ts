export interface SQLiteResultSetRowList {
  length: number;
  item: (index: number) => Record<string, unknown>;
}

export interface SQLiteResultSet {
  rows: SQLiteResultSetRowList;
  rowsAffected: number;
  insertId?: number;
}

export interface SQLiteAdapter {
  executeSql: (sql: string, params?: Array<string | number | null>) => Promise<SQLiteResultSet>;
}
