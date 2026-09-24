/**
 * @format
 */

import { AppRegistry } from 'react-native';
import 'react-native-get-random-values';
import App from './App';
import { name as appName } from './app.json';
import { processPhotoUploadQueue } from './src/services/photoUploadQueue';

AppRegistry.registerComponent(appName, () => App);
AppRegistry.registerHeadlessTask('PhotoUploadWorker', () => async () => {
  await processPhotoUploadQueue();
});
