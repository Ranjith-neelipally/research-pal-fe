import { NativeModules, Platform, Share } from 'react-native';
import * as RNFS from '@dr.pogodin/react-native-fs';

export interface DeviceStorageInfo {
  totalBytes: number;
  availableBytes: number;
  usedBytes: number;
}

interface DeviceStorageNativeModule {
  getStorageInfo?(): Promise<{ totalBytes?: number; freeBytes?: number; usedBytes?: number; totalSpace?: number; freeSpace?: number }>;
  saveToDownloads(fileName: string, mimeType: string, base64Data: string): Promise<string>;
  saveToPhotos?(fileName: string, mimeType: string, base64Data: string): Promise<string>;
}

const nativeDeviceStorage = NativeModules.DeviceStorage as
  | DeviceStorageNativeModule
  | undefined;

export const getDeviceStorageInfo = async (): Promise<DeviceStorageInfo> => {
  if (typeof nativeDeviceStorage?.getStorageInfo !== 'function') {
    throw new Error(`${Platform.OS} DeviceStorage native module is unavailable.`);
  }

  const result = await nativeDeviceStorage.getStorageInfo();
  const totalBytes = Number(result.totalBytes ?? result.totalSpace);
  const availableBytes = Number(result.freeBytes ?? result.freeSpace);
  const usedBytes = Number(result.usedBytes ?? totalBytes - availableBytes);

  if (!Number.isFinite(totalBytes) || totalBytes <= 0 || !Number.isFinite(availableBytes) || availableBytes < 0) {
    throw new Error(`${Platform.OS} returned invalid device storage values.`);
  }

  return { totalBytes, availableBytes, usedBytes };
};

export const saveToDownloads = async (fileName: string, mimeType: string, base64Data: string) => {
  if (Platform.OS === 'ios') {
    const path = `${RNFS.TemporaryDirectoryPath}/${fileName}`;
    await RNFS.writeFile(path, base64Data, 'base64');
    try {
      await Share.share({ title: fileName, url: `file://${path}` });
      return { fileName, uri: `file://${path}` };
    } finally {
      if (await RNFS.exists(path)) await RNFS.unlink(path);
    }
  }
  if (!nativeDeviceStorage) {
    throw new Error('Android Downloads publisher is unavailable.');
  }
  if (typeof nativeDeviceStorage.saveToDownloads !== 'function') {
    throw new Error('This installed app version does not support Downloads export. Rebuild and reinstall the Android app.');
  }
  const uri = await nativeDeviceStorage.saveToDownloads(fileName, mimeType, base64Data);
  if (!uri) throw new Error('Android did not return a public Downloads URI.');
  return { fileName, uri };
};

export const saveToPhotos = async (fileName: string, mimeType: string, base64Data: string) => {
  if (typeof nativeDeviceStorage?.saveToPhotos !== 'function') {
    throw new Error(`${Platform.OS} Photos publisher is unavailable.`);
  }
  const uri = await nativeDeviceStorage.saveToPhotos(fileName, mimeType, base64Data);
  if (!uri) throw new Error(`${Platform.OS} did not return a public Photos URI.`);
  return { fileName, uri };
};
