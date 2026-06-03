import axios from 'axios';
import { Alert } from 'react-native';

export interface NormalizedApiError {
  code: string;
  message: string;
  status?: number;
  details?: unknown;
  requestId?: string;
  isNetworkError: boolean;
  isAuthError: boolean;
}

const fallbackMessage = 'Something went wrong. Please try again.';

const messageByCode: Record<string, string> = {
  TOKEN_EXPIRED: 'Your session expired. Please sign in again.',
  INVALID_TOKEN: 'Your session expired. Please sign in again.',
  UNAUTHORIZED: 'Please sign in again to continue.',
  NETWORK_ERROR: 'You appear to be offline. Check your connection and try again.',
  TIMEOUT: 'The request took too long. Please try again.',
  VALIDATION_ERROR: 'Please check the highlighted details and try again.',
  RATE_LIMITED: 'Too many attempts. Please wait a moment and try again.',
};

const firstMessage = (value: unknown): string | undefined => {
  if (typeof value === 'string') return value;
  if (Array.isArray(value)) return firstMessage(value[0]);
  return undefined;
};

export const normalizeApiError = (error: unknown): NormalizedApiError => {
  if (
    error &&
    typeof error === 'object' &&
    'code' in error &&
    'message' in error &&
    'isNetworkError' in error
  ) {
    return error as NormalizedApiError;
  }

  if (!axios.isAxiosError(error)) {
    const message = error instanceof Error ? error.message : fallbackMessage;
    return {
      code: 'UNKNOWN_ERROR',
      message,
      isNetworkError: false,
      isAuthError: false,
    };
  }

  const status = error.response?.status;
  const responseData = error.response?.data as any;
  const apiError = responseData?.error;
  const code =
    apiError?.code ||
    (status === 429
      ? 'RATE_LIMITED'
      : status === 401
      ? 'UNAUTHORIZED'
      : error.code === 'ECONNABORTED'
      ? 'TIMEOUT'
      : !error.response
      ? 'NETWORK_ERROR'
      : 'API_ERROR');

  const message =
    apiError?.message ||
    responseData?.message ||
    firstMessage(responseData?.errors) ||
    messageByCode[code] ||
    fallbackMessage;

  return {
    code,
    message: messageByCode[code] || message,
    status,
    details: apiError?.details || responseData?.errors,
    requestId: responseData?.requestId,
    isNetworkError: !error.response || code === 'NETWORK_ERROR',
    isAuthError: status === 401 || code === 'TOKEN_EXPIRED' || code === 'INVALID_TOKEN',
  };
};

export const getUserFacingErrorMessage = (error: unknown) =>
  normalizeApiError(error).message;

export const showApiErrorAlert = (
  title: string,
  error: unknown,
  fallback = fallbackMessage,
) => {
  const parsed = normalizeApiError(error);
  Alert.alert(title, parsed.message || fallback);
};
