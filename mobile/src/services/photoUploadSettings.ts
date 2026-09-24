import AsyncStorage from '@react-native-async-storage/async-storage';

export type PhotoUploadSettings = {
  wifiOnly: boolean;
  chargingOnly: boolean;
};

const SETTINGS_KEY = 'researchpal.photoUpload.settings.v1';
const DEFAULT_SETTINGS: PhotoUploadSettings = { wifiOnly: true, chargingOnly: true };

export async function getPhotoUploadSettings(): Promise<PhotoUploadSettings> {
  const raw = await AsyncStorage.getItem(SETTINGS_KEY);
  if (!raw) return DEFAULT_SETTINGS;
  try {
    const parsed = JSON.parse(raw) as Partial<PhotoUploadSettings>;
    return {
      wifiOnly: parsed.wifiOnly !== false,
      chargingOnly: parsed.chargingOnly !== false,
    };
  } catch {
    return DEFAULT_SETTINGS;
  }
}

export async function setPhotoUploadSettings(settings: PhotoUploadSettings) {
  await AsyncStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
  return settings;
}
