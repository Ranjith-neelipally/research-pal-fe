import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useEffect } from 'react';

import { useAuthStore } from '../../store/auth.store';
import { getAllStoredData } from '../../utils/common';

import AuthNavigator from '../AuthNavigator';
import RootNavigator from '../RootNavigator';
import ProjectsNavigator from '../ProjectsNavigator';

export type RootStackParamList = {
  Auth: undefined;
  Main: undefined;
  ProjectCreation: undefined;
};

const RootStack = createNativeStackNavigator<RootStackParamList>();

function MainNavigator() {
  const setUser = useAuthStore(state => state.setUser);
  const setHydrated = useAuthStore(state => state.setHydrated);
  const isHydrated = useAuthStore(state => state.isHydrated);
  const token = useAuthStore(state => state.user?.token);

  const isLoggedIn = Boolean(token);

  useEffect(() => {
    const bootstrapAuth = async () => {
      const stored = await getAllStoredData();

      if (stored?.access_token) {
        setUser({
          _id: stored['_id'] || '',
          username: stored['username'] || '',
          email: stored['email'] || '',
          verified: stored['verified'] === 'true',
          token: stored['access_token'],
        });
      }

      setHydrated(true);
    };

    bootstrapAuth();
  }, []);

  if (!isHydrated) {
    return null;
  }

  return (
    <RootStack.Navigator
      initialRouteName={isLoggedIn ? 'Main' : 'Auth'}
      screenOptions={{ headerShown: false }}
    >
      <RootStack.Screen name="Auth" component={AuthNavigator} />
      <RootStack.Screen name="Main" component={RootNavigator} />
      <RootStack.Screen name="ProjectCreation" component={ProjectsNavigator} />
    </RootStack.Navigator>
  );
}

export default MainNavigator;
