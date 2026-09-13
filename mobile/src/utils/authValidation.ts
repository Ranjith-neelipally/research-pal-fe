export type AuthFieldErrors = Record<string, string | undefined>;

const emailExpression = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const allowedPasswordExpression = /^[a-zA-Z\d!@#$%^&*]+$/;

export const validateRequired = (value: string, message: string) =>
  value.trim() ? undefined : message;

export const validateEmail = (value: string) => {
  const email = value.trim();
  if (!email) return 'Email is required.';
  if (!emailExpression.test(email)) return 'Enter a valid email address.';
  return undefined;
};

export const validateBackendPassword = (value: string) => {
  const password = value.trim();
  if (!password) return 'Password is required.';
  if (password.length < 8) return 'Password must be at least 8 characters.';
  if (!/[a-zA-Z]/.test(password)) return 'Password must include a letter.';
  if (!/\d/.test(password)) return 'Password must include a number.';
  if (!/[!@#$%^&*]/.test(password)) return 'Password must include a symbol.';
  if (!allowedPasswordExpression.test(password)) {
    return 'Password can only include letters, numbers, and !@#$%^&*.';
  }
  return undefined;
};

export const validateChangePassword = (
  currentPassword: string,
  newPassword: string,
) => {
  const errors: AuthFieldErrors = {};
  if (!currentPassword) errors.currentPassword = 'Current password is required.';
  if (!newPassword) {
    errors.newPassword = 'New password is required.';
  } else if (newPassword.length < 8) {
    errors.newPassword = 'New password must be at least 8 characters.';
  }
  return errors;
};

export const validateVerificationCode = (value: string) => {
  const code = value.trim();
  if (!code) return 'Verification code is required.';
  if (!/^\d{6}$/.test(code)) return 'Enter the 6-digit verification code.';
  return undefined;
};
