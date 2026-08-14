import api, { refreshAccessToken, SESSION_ID_KEY } from './api';
import { useAuthStore } from '../store/auth.store';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { cancelAllIdeaReminders } from './ideaReminders';

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
    profession?: string;
    createdAt?: string;
  };
  accessToken?: string;
  refreshToken: string;
  token?: string;
}

const REFRESH_TOKEN_KEY = 'refresh_token';
const ACCESS_TOKEN_KEY = 'access_token';
const VERIFICATION_TOKEN_KEY = 'verification_token';
let sessionRefreshPromise: Promise<boolean> | null = null;

const authDebug = (message: string, details?: Record<string, unknown>) => {
  if (__DEV__) console.log(`[auth] ${message}`, details || '');
};

const clearStoredLogin = async () => {
  await cancelAllIdeaReminders();
  await AsyncStorage.multiRemove([
    REFRESH_TOKEN_KEY,
    ACCESS_TOKEN_KEY,
    SESSION_ID_KEY,
    '_id',
    'username',
    'verified',
    'email',
    'profession',
    'created_at',
  ]);
  await useAuthStore.getState().clearUser();
};

export async function loginService(email: string, password: string) {
  const response = await api.post<loginResponse>('auth/login', {
    email,
    password,
  });
  const responseData = (response.data as any).data || response.data;
  const accessToken = responseData.accessToken || responseData.token || '';
  const sessionId = responseData.sessionId || '';

  if (!accessToken || !responseData.refreshToken) {
    throw new Error('Login response did not include mobile credentials');
  }

  const credentials: [string, string][] = [
    [REFRESH_TOKEN_KEY, responseData.refreshToken],
    [ACCESS_TOKEN_KEY, accessToken],
    ['_id', responseData.profile.id],
    ['username', responseData.profile.name],
    ['verified', String(responseData.profile.verified)],
    ['email', responseData.profile.email],
    ['profession', responseData.profile.profession || ''],
    ['created_at', responseData.profile.createdAt || ''],
  ];
  if (sessionId) credentials.push([SESSION_ID_KEY, sessionId]);
  await AsyncStorage.multiSet(credentials);
  authDebug('login credentials persisted', {
    accessTokenReceived: true,
    refreshTokenReceived: true,
    refreshTokenPersisted: true,
    sessionIdPersisted: Boolean(sessionId),
  });

  await useAuthStore.getState().setUser({
    _id: responseData.profile.id,
    username: responseData.profile.name || '',
    email: responseData.profile.email,
    verified: responseData.profile.verified,
    token: accessToken,
    profession: responseData.profile.profession || '',
    createdAt: responseData.profile.createdAt,
  });

  return responseData.profile.id;
}

const refreshStoredSession = async (): Promise<boolean> => {
  const stored = await AsyncStorage.multiGet([
    REFRESH_TOKEN_KEY,
    ACCESS_TOKEN_KEY,
    '_id',
    'username',
    'email',
    'verified',
    'profession',
    'created_at',
  ]);
  const storedMap = stored.reduce((acc, [key, value]) => {
    acc[key] = value;
    return acc;
  }, {} as Record<string, string | null>);
  const refreshToken = storedMap[REFRESH_TOKEN_KEY];
  authDebug('bootstrap storage loaded', {
    refreshTokenFound: Boolean(refreshToken),
    accessTokenFound: Boolean(storedMap[ACCESS_TOKEN_KEY]),
  });
  if (!refreshToken) {
    // Also cleans alarms left by older app builds that logged out without
    // cancelling device-local reminders.
    await cancelAllIdeaReminders();
    return false;
  }

  const cachedAccessToken = storedMap[ACCESS_TOKEN_KEY];
  if (cachedAccessToken && storedMap._id) {
    await useAuthStore.getState().setUser({
      _id: storedMap._id,
      username: storedMap.username || '',
      email: storedMap.email || '',
      verified: storedMap.verified === 'true',
      token: cachedAccessToken,
      profession: storedMap.profession || '',
      createdAt: storedMap.created_at || undefined,
    });
  }

  const accessToken = await refreshAccessToken();
  if (!accessToken) return Boolean(cachedAccessToken && storedMap._id);

  await useAuthStore.getState().setUser({
    _id: storedMap._id || '',
    username: storedMap.username || '',
    email: storedMap.email || '',
    verified: storedMap.verified === 'true',
    token: accessToken,
    profession: storedMap.profession || '',
    createdAt: storedMap.created_at || undefined,
  });
  authDebug('authenticated state restored');
  return true;
};

export async function refreshSession() {
  if (!sessionRefreshPromise) {
    sessionRefreshPromise = refreshStoredSession().finally(() => {
      sessionRefreshPromise = null;
    });
  }
  return sessionRefreshPromise;
}

export async function logoutService(fromAll = false) {
  const refreshToken = await AsyncStorage.getItem(REFRESH_TOKEN_KEY);

  // Reminders are device-local and must not survive either logout path.
  await cancelAllIdeaReminders();

  try {
    await api.post(
      '/auth/logout',
      { refreshToken },
      { params: fromAll ? { fromAll: 'yes' } : undefined },
    );
  } finally {
    await clearStoredLogin();
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
