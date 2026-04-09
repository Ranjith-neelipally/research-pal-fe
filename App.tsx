import React, { useEffect } from 'react';
import { Alert, BackHandler, StatusBar, useColorScheme } from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { NavigationContainer } from '@react-navigation/native';
import { Theme } from './src/components/theme';
import MainNavigator from './src/router/MainNavigator';
import { navigationRef } from './src/router/navigationRef';

function App() {
  const isDarkMode = useColorScheme() === 'dark';
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

  return (
    <SafeAreaProvider>
      <SafeAreaView
        style={{ flex: 1, backgroundColor: Theme.colors.background }}
      >
        <NavigationContainer>
          <StatusBar
            barStyle={isDarkMode ? 'light-content' : 'dark-content'}
            backgroundColor={Theme.colors.background}
          />
          <MainNavigator />
        </NavigationContainer>
      </SafeAreaView>
    </SafeAreaProvider>
  );
}

export default App;
