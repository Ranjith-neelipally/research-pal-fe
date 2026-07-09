import React, { useEffect, useState } from 'react';
import { Alert, BackHandler, StatusBar, StyleSheet, useColorScheme, View } from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { NavigationContainer } from '@react-navigation/native';
import { Theme } from './src/components/theme';
import MainNavigator from './src/router/MainNavigator';
import { navigationRef } from './src/router/navigationRef';
import AnimatedBootSplash from './src/components/AnimatedBootSplash';

function App() {
  const isDarkMode = useColorScheme() === 'dark';
  const [navigationReady, setNavigationReady] = useState(false);
  const [showBootAnimation, setShowBootAnimation] = useState(true);
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
      <View style={styles.root}>
        <SafeAreaView style={styles.safeArea}>
          <NavigationContainer
            onReady={() => {
              setNavigationReady(true);
            }}
          >
            <StatusBar
              barStyle={isDarkMode ? 'light-content' : 'dark-content'}
              backgroundColor={Theme.colors.background}
            />
            <MainNavigator />
          </NavigationContainer>
        </SafeAreaView>
        {showBootAnimation && (
          <AnimatedBootSplash
            ready={navigationReady}
            onAnimationEnd={() => setShowBootAnimation(false)}
          />
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
});

export default App;
