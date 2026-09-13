import api from './api';

export const verifyResetPasswordToken = (token: string) =>
  api.post('/auth/verify-reset-password', { token });

export const updateResetPassword = (token: string, password: string) =>
  api.post('/auth/update-password', { token, password });
