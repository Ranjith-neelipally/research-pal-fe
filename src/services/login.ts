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
  token: string;
}

export async function loginService(email: string, password: string) {
  const response = await api.post<loginResponse>('auth/sign-in', {
    email,
    password,
  });

  await AsyncStorage.multiSet([
    ['access_token', response.data.token],
    ['_id', response.data.profile.id],
    ['username', response.data.profile.name],
    ['verified', String(response.data.profile.verified)],
    ['email', response.data.profile.email],
  ]);

  await useAuthStore.getState().setUser({
    _id: response.data.profile.id,
    username: response.data.profile.name || '',
    email: '',
    verified: response.data.profile.verified,
    token: response.data.token,
  });

  return response.data.profile.id;
}

export async function SignUp(userinformation: userinformation) {
  const { email, password, userName } =
    userinformation;

    console.log(userinformation, 'userinformation');
  const res = await api.post('/auth/signup', {
    email,
    password,
    userName,
  });
  const data = { responseStatus: res.status, message: res.data.message };
  if (res.data.user_id) {
    await AsyncStorage.setItem('temp_user_id', res.data.user_id);
  }
  return data;
}

export async function handleAccountVerification(code: string) {
  try {
    const userId = await AsyncStorage.getItem('temp_user_id');
    if (!userId) {
      throw new Error('User ID not found');
    }
    const response = await api.post('/auth/verify-email', {
      userId,
      code,
    });
    return response;
  } catch (error) {
    console.error('Verification error:', error);
    throw error;
  }
}