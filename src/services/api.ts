import axios from 'axios';
import { useAuthStore } from '../store/auth.store';
import AsyncStorage from '@react-native-async-storage/async-storage';

const getTokenFromStorage = async () => {
  try {
    const token = await AsyncStorage.getItem('access_token');
    return token;
  } catch (error) {
    console.error('Error retrieving token from storage:', error);
    return null;
  }
}

// Create an instance of Axios
const api = axios.create({
  // baseURL: 'http://192.168.31.60:1430/',
  // baseURL: 'http://10.0.2.2:1430/',
    baseURL: 'https://node-be-sigma.vercel.app/',
  // baseURL: 'http://192.168.31.60:1430/',
  // baseURL: 'https://research-pal-api-726814154156.asia-south1.run.app/',
  // baseURL: 'https://research-pal-api-726814154156.asia-south1.run.app/',

  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 10000,
});

// Request interceptor
api.interceptors.request.use(
  async (config: any) => {
    if (!config.headers) {
      config.headers = {};
    }
    const user = useAuthStore.getState().getUser();
    const tokenData = user?.token || await getTokenFromStorage();
    console.log(tokenData, 'api token');

    if (tokenData) {
      config.headers.Authorization = `Bearer ${tokenData}`;
    }
    return config;
  },
  error => {
    // Handle request errors
    return Promise.reject(error);
  },
);

// Response interceptor
api.interceptors.response.use(
  response => {
    // Modify the response data
    // response.data = transformData(response.data);
    return response;
  },
  error => {
    // Handle response errors
    return Promise.reject(error);
  },
);

export default api;
