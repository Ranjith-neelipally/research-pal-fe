import { executeSyncSql } from '../sqlite/database';

export const getSyncState = async (key: string): Promise<string | null> => {
  const result = await executeSyncSql(`SELECT value FROM sync_state WHERE key = ? LIMIT 1;`, [key]);

  if (result.rows.length === 0) {
    return null;
  }

  return String(result.rows.item(0).value ?? '');
};

export const setSyncState = async (key: string, value: string) => {
  await executeSyncSql(
    `INSERT INTO sync_state(key, value)
     VALUES(?, ?)
     ON CONFLICT(key) DO UPDATE SET value = excluded.value;`,
    [key, value],
  );
};
