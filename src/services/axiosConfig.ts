import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

// Default smart fallback depending on platform
const getDefaultBaseUrl = () => {
  // Production / Deployed default
  return 'https://hostel-app-uiyd.onrender.com/api';
};

export let CURRENT_BASE_URL = getDefaultBaseUrl();

export const api = axios.create({
  baseURL: CURRENT_BASE_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Initialize dynamic base URL from AsyncStorage
export const initApiConfig = async () => {
  try {
    const savedUrl = await AsyncStorage.getItem('custom_api_url');
    if (savedUrl) {
      CURRENT_BASE_URL = savedUrl;
      api.defaults.baseURL = savedUrl;
    }
  } catch (e) {
    console.warn('Failed to load custom API URL:', e);
  }
};

// Set custom API Base URL
export const setCustomApiUrl = async (url: string) => {
  try {
    const sanitized = url.endsWith('/api') ? url : `${url.replace(/\/+$/, '')}/api`;
    CURRENT_BASE_URL = sanitized;
    api.defaults.baseURL = sanitized;
    await AsyncStorage.setItem('custom_api_url', sanitized);
    return true;
  } catch (e) {
    return false;
  }
};

// Request Interceptor: Automatically inject Auth Token
api.interceptors.request.use(
  async (config) => {
    try {
      const token = await AsyncStorage.getItem('token');
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    } catch (e) {}
    return config;
  },
  (error) => Promise.reject(error)
);

// Response Interceptor: Easy error reporting
api.interceptors.response.use(
  (response) => response,
  (error) => {
    const message = error.response?.data?.message || error.message || 'Network request failed';
    console.warn(`[API Error] ${error.config?.method?.toUpperCase()} ${error.config?.url}:`, message);
    return Promise.reject(error);
  }
);

// Auto-run initialization
initApiConfig();