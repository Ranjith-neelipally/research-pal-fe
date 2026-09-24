import React, { useEffect, useState } from 'react';
import { Alert, BackHandler, Pressable, StatusBar, StyleSheet, Text, useColorScheme, View } from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { NavigationContainer } from '@react-navigation/native';
import { Theme } from './src/components/theme';
import MainNavigator from './src/router/MainNavigator';
import { navigationRef } from './src/router/navigationRef';
import AnimatedBootSplash from './src/components/AnimatedBootSplash';
import { useAuthStore } from './src/store/auth.store';
import { initializeOfflineSyncFoundation } from './src/sync';
import {
  backfillExistingPhotoUploads,
  processPhotoUploadQueue,
  subscribePhotoUploadEvents,
} from './src/services/photoUploadQueue';

const linking = {
  prefixes: ['https://www.research-pal.com'],
  config: {
    screens: {
      ResetPassword: 'reset-password',
    },
  },
};

function App() {
  const isDarkMode = useColorScheme() === 'dark';
  const [showBootAnimation, setShowBootAnimation] = useState(true);
  const [photoBanner, setPhotoBanner] = useState<{ message: string; photoIds?: string[] } | null>(null);
  const isHydrated = useAuthStore(state => state.isHydrated);
  useEffect(() => {
    const onBackPress = () => {
      if (navigationRef.isReady() && navigationRef.canGoBack()) {
        navigationRef.goBack();
        return true;
      }

      Alert.alert(
        'Exit App',
        'Do you want to exit?',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'YES', onPress: () => BackHandler.exitApp() },
        ],
        { cancelable: false },
      );

      return true;
    };

    const sub = BackHandler.addEventListener('hardwareBackPress', onBackPress);

    return () => sub.remove();
  }, []);

  useEffect(() => {
    void initializeOfflineSyncFoundation()
      .then(() => backfillExistingPhotoUploads())
      .then(() => processPhotoUploadQueue())
      .catch(error => {
        if (__DEV__) console.warn('Photo upload queue initialization failed', error);
      });
  }, []);

  useEffect(() => subscribePhotoUploadEvents(event => {
    if (event.type === 'queued') {
      setPhotoBanner({
        message: 'New photos added. They will upload when your upload conditions are met.',
        photoIds: event.photoIds,
      });
    } else if (event.type === 'uploading') {
      setPhotoBanner({ message: `Uploading ${event.current} of ${event.total}` });
    } else if (event.type === 'complete') {
      setPhotoBanner({ message: 'Upload complete' });
      setTimeout(() => setPhotoBanner(null), 2500);
    } else if (event.type === 'failed') {
      setPhotoBanner({ message: 'Some photos failed and will retry automatically' });
    }
  }), []);

  const uploadBannerNow = () => {
    const ids = photoBanner?.photoIds;
    setPhotoBanner({ message: 'Uploading photos now...' });
    void processPhotoUploadQueue({ overrideRestrictions: true, photoIds: ids });
  };

  return (
    <SafeAreaProvider>
      <View style={styles.root}>
        <SafeAreaView edges={['top', 'left', 'right']} style={styles.safeArea}>
          <NavigationContainer ref={navigationRef} linking={linking}>
            <StatusBar
              barStyle={isDarkMode ? 'light-content' : 'dark-content'}
            />
            <MainNavigator />
          </NavigationContainer>
        </SafeAreaView>
        {showBootAnimation && (
          <AnimatedBootSplash
            ready={isHydrated}
            onAnimationEnd={() => setShowBootAnimation(false)}
          />
        )}
        {photoBanner && (
          <View style={styles.photoBanner}>
            <Text style={styles.photoBannerText}>{photoBanner.message}</Text>
            {photoBanner.photoIds?.length ? (
              <Pressable onPress={uploadBannerNow} style={styles.photoBannerAction}>
                <Text style={styles.photoBannerActionText}>Upload now</Text>
              </Pressable>
            ) : null}
          </View>
        )}
      </View>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: Theme.colors.background,
  },
  safeArea: {
    flex: 1,
    backgroundColor: Theme.colors.background,
  },
  photoBanner: {
    position: 'absolute',
    left: 14,
    right: 14,
    bottom: 18,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
    borderRadius: 10,
    backgroundColor: '#161b23',
    borderWidth: 1,
    borderColor: '#2b3542',
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  photoBannerText: {
    flex: 1,
    color: Theme.colors.fontSecondary,
    fontSize: 12,
  },
  photoBannerAction: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: Theme.colors.primary,
  },
  photoBannerActionText: {
    color: '#101318',
    fontWeight: '700',
    fontSize: 12,
  },
});

export default App;
