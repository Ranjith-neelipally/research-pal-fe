import { NativeModules, Platform } from 'react-native';

export interface DeviceStorageInfo {
  totalBytes: number;
  availableBytes: number;
}

interface DeviceStorageNativeModule {
  getStorageInfo(): Promise<{ totalSpace: number; freeSpace: number }>;
  saveToDownloads(fileName: string, mimeType: string, base64Data: string): Promise<string>;
}

const nativeDeviceStorage = NativeModules.DeviceStorage as
  | DeviceStorageNativeModule
  | undefined;

export const getDeviceStorageInfo = async (): Promise<DeviceStorageInfo> => {
  if (Platform.OS !== 'android' || !nativeDeviceStorage) {
    throw new Error('Android DeviceStorage native module is unavailable.');
  }

  const result = await nativeDeviceStorage.getStorageInfo();
  const totalBytes = Number(result.totalSpace);
  const availableBytes = Number(result.freeSpace);

  if (!Number.isFinite(totalBytes) || totalBytes <= 0 || !Number.isFinite(availableBytes) || availableBytes < 0) {
    throw new Error('Android returned invalid device storage values.');
  }

  return { totalBytes, availableBytes };
};

export const saveToDownloads = async (fileName: string, mimeType: string, base64Data: string) => {
  if (Platform.OS !== 'android' || !nativeDeviceStorage) {
    throw new Error('Android Downloads publisher is unavailable.');
  }
  if (typeof nativeDeviceStorage.saveToDownloads !== 'function') {
    throw new Error('This installed app version does not support Downloads export. Rebuild and reinstall the Android app.');
  }
  const uri = await nativeDeviceStorage.saveToDownloads(fileName, mimeType, base64Data);
  if (!uri) throw new Error('Android did not return a public Downloads URI.');
  return { fileName, uri };
};
