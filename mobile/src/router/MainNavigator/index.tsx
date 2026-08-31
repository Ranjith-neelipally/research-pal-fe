import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useEffect } from 'react';
import React from 'react';

import { useAuthStore } from '../../store/auth.store';

import AuthNavigator from '../AuthNavigator';
import RootNavigator from '../RootNavigator';
import ProjectsNavigator from '../ProjectsNavigator';
import { refreshSession } from '../../services/login';
import SettingsScreen from '../../screens/Root/Settings';

export type RootStackParamList = {
  Auth: undefined;
  Main: undefined;
  ProjectCreation: undefined;
  Settings: undefined;
};

const RootStack = createNativeStackNavigator<RootStackParamList>();

function MainNavigator() {
  const setHydrated = useAuthStore(state => state.setHydrated);
  const isHydrated = useAuthStore(state => state.isHydrated);
  const token = useAuthStore(state => state.user?.token);

  const isLoggedIn = Boolean(token);

  useEffect(() => {
    const bootstrapAuth = async () => {
      let hydrationTimeout: ReturnType<typeof setTimeout> | undefined;

      try {
        await Promise.race([
          refreshSession(),
          new Promise<void>(resolve => {
            hydrationTimeout = setTimeout(resolve, 3000);
          }),
        ]);
      } catch (error) {
        if (__DEV__) console.warn('[auth] hydration failed', error);
      } finally {
        if (hydrationTimeout) clearTimeout(hydrationTimeout);
        if (__DEV__) console.log('[auth] hydration completed');
        setHydrated(true);
      }
    };

    bootstrapAuth();
  }, [setHydrated]);

  if (!isHydrated) {
    return null;
  }

  return (
    <RootStack.Navigator
      screenOptions={{ headerShown: false }}
    >
      {isLoggedIn ? (
        <>
          <RootStack.Screen name="Main" component={RootNavigator} />
          <RootStack.Screen name="ProjectCreation" component={ProjectsNavigator} />
          <RootStack.Screen name="Settings" component={SettingsScreen} />
        </>
      ) : (
        <RootStack.Screen name="Auth" component={AuthNavigator} />
      )}
    </RootStack.Navigator>
  );
}

export default MainNavigator;
