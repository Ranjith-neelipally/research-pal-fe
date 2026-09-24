import AsyncStorage from '@react-native-async-storage/async-storage';
import api from './api';
import { useAuthStore } from '../store/auth.store';

export const AUTO_WEATHER_KEY = 'preference_auto_weather';
export const getProfile = async () => (await api.get('/auth/get-user')).data?.data?.profile;

export const updateProfile = async (name: string, profession: string) => {
  const profile = (await api.patch('/auth/profile', { name, profession })).data?.data?.profile;
  const current = useAuthStore.getState().user;
  if (current) await useAuthStore.getState().setUser({ ...current, username: profile.name, profession: profile.profession, createdAt: profile.createdAt });
  await AsyncStorage.setMany({ username: profile.name, profession: profile.profession || '', created_at: profile.createdAt || '' });
  return profile;
};

export const changePassword = (currentPassword: string, newPassword: string) => api.post('/auth/change-password', { currentPassword, newPassword });
export const getSessions = async () => (await api.get('/auth/sessions')).data?.data?.sessions || [];
export const revokeSession = (id: string) => api.delete(`/auth/sessions/${id}`);
