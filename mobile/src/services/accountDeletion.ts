import AsyncStorage from '@react-native-async-storage/async-storage';
import api from './api';
import { cancelAllIdeaReminders } from './ideaReminders';
import { cleanupProjectLocalData } from '../localStorage';
import { executeSyncSql } from '../sync/sqlite/database';
import { useAuthStore } from '../store/auth.store';
import { useProjectsStore, useProjectsActionStore } from '../store/Projects/Projects.store';
import { usePlotsStore } from '../store/Projects/plots.store';
import { useQuickNotesStore } from '../store/notes.store';
import { clearSecureCredentials } from './secureCredentials';

const ACCOUNT_KEYS = [
  'refresh_token', 'access_token', 'session_id', '_id', 'username', 'verified',
  'email', 'profession', 'created_at', 'temp_user_id', 'verification_token',
];

export const requestAccountDeletion = () => api.post('/auth/account/delete/request');
export const confirmAccountDeletion = (otp: string) => api.post('/auth/account/delete/confirm', { otp });

export async function clearUserLocalData() {
  const userId = useAuthStore.getState().getUserId();
  try {
    await cancelAllIdeaReminders();
    if (userId) {
      const projects = await executeSyncSql('SELECT id FROM projects WHERE user_id = ?', [userId]);
      for (let index = 0; index < projects.rows.length; index += 1) {
        await cleanupProjectLocalData(String(projects.rows.item(index).id));
      }
      const ideas = await executeSyncSql('SELECT id FROM ideas WHERE user_id = ?', [userId]);
      for (let index = 0; index < ideas.rows.length; index += 1) {
        const ideaId = String(ideas.rows.item(index).id);
        await executeSyncSql("DELETE FROM outbox_ops WHERE entity_type = 'idea' AND entity_id = ?", [ideaId]);
        await executeSyncSql("DELETE FROM sync_conflicts WHERE entity_type = 'idea' AND entity_id = ?", [ideaId]);
      }
      await executeSyncSql('DELETE FROM ideas WHERE user_id = ?', [userId]);
      await executeSyncSql('DELETE FROM sync_state');
    }
  } catch (error) {
    if (__DEV__) console.warn('Unable to completely clear account cache', error);
  }
  await AsyncStorage.removeMany([...ACCOUNT_KEYS]);
  await clearSecureCredentials();
  useProjectsStore.getState().setProjectsData([]);
  useProjectsActionStore.getState().setIsProjectAdding(false);
  usePlotsStore.getState().setPlot([]);
  useQuickNotesStore.getState().setQuickNotes([]);
  await useAuthStore.getState().clearUser();
}
