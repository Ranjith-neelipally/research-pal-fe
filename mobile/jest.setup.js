/* global jest */

jest.mock('@dr.pogodin/react-native-fs', () => ({
  DocumentDirectoryPath: '/tmp/researchpal-test',
  DownloadDirectoryPath: '/tmp/researchpal-downloads',
  exists: jest.fn(async () => false),
  mkdir: jest.fn(async () => undefined),
  readDir: jest.fn(async () => []),
  stat: jest.fn(async () => ({ size: 0 })),
  unlink: jest.fn(async () => undefined),
  copyFile: jest.fn(async () => undefined),
  writeFile: jest.fn(async () => undefined),
}));

jest.mock('react-native-image-picker', () => ({
  launchCamera: jest.fn(async () => ({ didCancel: true })),
  launchImageLibrary: jest.fn(async () => ({ didCancel: true })),
}));

jest.mock('react-native-keychain', () => ({
  ACCESSIBLE: { WHEN_UNLOCKED_THIS_DEVICE_ONLY: 'WhenUnlockedThisDeviceOnly' },
  getGenericPassword: jest.fn(async () => false),
  setGenericPassword: jest.fn(async () => true),
  resetGenericPassword: jest.fn(async () => true),
}));

jest.mock('@react-native-community/geolocation', () => ({
  __esModule: true,
  default: {
    getCurrentPosition: jest.fn(),
    watchPosition: jest.fn(),
    clearWatch: jest.fn(),
    stopObserving: jest.fn(),
    requestAuthorization: jest.fn(),
    setRNConfiguration: jest.fn(),
  },
}));

jest.mock('react-native-bootsplash', () => ({
  __esModule: true,
  default: { useHideAnimation: () => ({ container: {}, logo: {}, brand: {}, ready: true }) },
}));
