import * as Keychain from 'react-native-keychain';

const SERVICE = 'com.researchpal.app.authentication';

export type SecureCredentials = {
  accessToken: string;
  refreshToken: string;
  sessionId?: string;
};

export async function getSecureCredentials(): Promise<SecureCredentials | null> {
  const result = await Keychain.getGenericPassword({ service: SERVICE });
  if (!result) return null;
  try {
    const value = JSON.parse(result.password) as SecureCredentials;
    return value.accessToken && value.refreshToken ? value : null;
  } catch {
    await clearSecureCredentials();
    return null;
  }
}

export async function setSecureCredentials(value: SecureCredentials) {
  await Keychain.setGenericPassword('researchpal-auth', JSON.stringify(value), {
    service: SERVICE,
    accessible: Keychain.ACCESSIBLE.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
  });
}

export const clearSecureCredentials = () =>
  Keychain.resetGenericPassword({ service: SERVICE });
