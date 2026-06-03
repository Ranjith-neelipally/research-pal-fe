import api from './api';
import { useAuthStore } from '../store/auth.store';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface userinformation {
  firstName: string;
  lastName: string;
  password: string;
  userName: string;
  createdDate: string;
  email: string;
}
interface loginResponse {
  profile: {
    id: string;
    name: string;
    verified: boolean;
    projects: string[];
    email: string;
  };
  accessToken?: string;
  refreshToken: string;
  token?: string;
}

const REFRESH_TOKEN_KEY = 'refresh_token';
const VERIFICATION_TOKEN_KEY = 'verification_token';

export async function loginService(email: string, password: string) {
  const response = await api.post<loginResponse>('auth/login', {
    email,
    password,
  });
  const responseData = (response.data as any).data || response.data;
  const accessToken = responseData.accessToken || responseData.token || '';

  await AsyncStorage.multiSet([
    [REFRESH_TOKEN_KEY, responseData.refreshToken],
    ['_id', responseData.profile.id],
    ['username', responseData.profile.name],
    ['verified', String(responseData.profile.verified)],
    ['email', responseData.profile.email],
  ]);

  await useAuthStore.getState().setUser({
    _id: responseData.profile.id,
    username: responseData.profile.name || '',
    email: responseData.profile.email,
    verified: responseData.profile.verified,
    token: accessToken,
  });

  return responseData.profile.id;
}

export async function refreshSession() {
  const refreshToken = await AsyncStorage.getItem(REFRESH_TOKEN_KEY);
  if (!refreshToken) return false;

  try {
    const response = await api.post<loginResponse>('/auth/refresh', {
      refreshToken,
    });
    const responseData = (response.data as any).data || response.data;
    const accessToken = responseData.accessToken || responseData.token || '';
    const nextRefreshToken = responseData.refreshToken;

    if (!accessToken || !nextRefreshToken) return false;

    await AsyncStorage.setItem(REFRESH_TOKEN_KEY, nextRefreshToken);

    const stored = await AsyncStorage.multiGet([
      '_id',
      'username',
      'email',
      'verified',
    ]);
    const storedMap = stored.reduce((acc, [key, value]) => {
      acc[key] = value;
      return acc;
    }, {} as Record<string, string | null>);

    await useAuthStore.getState().setUser({
      _id: storedMap._id || '',
      username: storedMap.username || '',
      email: storedMap.email || '',
      verified: storedMap.verified === 'true',
      token: accessToken,
    });

    return true;
  } catch (error) {
    await AsyncStorage.multiRemove([
      REFRESH_TOKEN_KEY,
      '_id',
      'username',
      'verified',
      'email',
    ]);
    await useAuthStore.getState().clearUser();
    return false;
  }
}

export async function logoutService(fromAll = false) {
  const refreshToken = await AsyncStorage.getItem(REFRESH_TOKEN_KEY);

  try {
    await api.post(
      '/auth/logout',
      { refreshToken },
      { params: fromAll ? { fromAll: 'yes' } : undefined },
    );
  } finally {
    await AsyncStorage.multiRemove([
      REFRESH_TOKEN_KEY,
      '_id',
      'username',
      'verified',
      'email',
    ]);
    await useAuthStore.getState().clearUser();
  }
}

export async function SignUp(userinformation: userinformation) {
  const { email, password, userName } =
    userinformation;

  const res = await api.post('/auth/signup', {
    email,
    password,
    userName,
  });
  const responseData = res.data?.data || res.data;
  const data = { responseStatus: res.status, message: res.data.message };
  if (responseData.user_id) {
    await AsyncStorage.setItem('temp_user_id', responseData.user_id);
  }
  if (responseData.verificationToken) {
    await AsyncStorage.setItem(
      VERIFICATION_TOKEN_KEY,
      responseData.verificationToken,
    );
  }
  return data;
}

export async function handleAccountVerification(code: string) {
  try {
    const userId = await AsyncStorage.getItem('temp_user_id');
    const verificationToken = await AsyncStorage.getItem(VERIFICATION_TOKEN_KEY);
    if (!userId) {
      throw new Error('User ID not found');
    }
    if (!verificationToken) {
      throw new Error('Verification token not found');
    }
    const response = await api.post('/auth/verify-email', {
      userId,
      code,
      verificationToken,
    });
    await AsyncStorage.multiRemove(['temp_user_id', VERIFICATION_TOKEN_KEY]);
    return response;
  } catch (error) {
    throw error;
  }
}
