import { NativeModules, Platform } from 'react-native';
import { getPhotoUploadSettings } from './photoUploadSettings';

type NativePhotoUploadScheduler = {
  getConditions?: () => Promise<{ isUnmetered: boolean; isCharging: boolean }>;
  schedule?: (wifiOnly: boolean, chargingOnly: boolean) => Promise<void>;
  beginBackgroundTask?: () => Promise<number | null>;
  endBackgroundTask?: (taskId: number) => Promise<void>;
};

const nativeScheduler = NativeModules.PhotoUploadScheduler as NativePhotoUploadScheduler | undefined;

export async function getUploadConditions() {
  return nativeScheduler?.getConditions?.() || { isUnmetered: true, isCharging: true };
}

export async function schedulePhotoUploadWork() {
  const settings = await getPhotoUploadSettings();
  await nativeScheduler?.schedule?.(settings.wifiOnly, settings.chargingOnly);
}

export async function conditionsAllowUpload(overrideRestrictions = false) {
  if (overrideRestrictions) return true;
  const [settings, conditions] = await Promise.all([
    getPhotoUploadSettings(),
    getUploadConditions(),
  ]);
  if (settings.wifiOnly && !conditions.isUnmetered) return false;
  if (settings.chargingOnly && !conditions.isCharging) return false;
  return true;
}

export async function withPhotoUploadBackgroundTask<T>(work: () => Promise<T>) {
  if (Platform.OS !== 'ios' || !nativeScheduler?.beginBackgroundTask) return work();
  const taskId = await nativeScheduler.beginBackgroundTask();
  try {
    return await work();
  } finally {
    if (typeof taskId === 'number') await nativeScheduler.endBackgroundTask?.(taskId);
  }
}
