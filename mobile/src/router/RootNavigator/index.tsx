import React, { useEffect } from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import FloatingTabs from './floatingtabs/floatingtabs';
import { Screens } from './helpers';
import ProjectDetails from '../../screens/Root/Projects/ProjectDetails';
import ProjectsHeader from '../ProjectsNavigator/ProjectsHeader';
import PlotNotesDetails from '../../screens/Root/Projects/ProjectNoteDetails';
import PlotNoteEditorScreen from '../../screens/Root/Projects/ProjectNoteDetails/editor';
import ObservationDetails from '../../screens/Root/Projects/Observations/ObservationDetails';
import { startMobilePhotoStreaming, stopMobilePhotoStreaming } from '../../services/photoStreaming';
import { useAuthStore } from '../../store/auth.store';

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();

function ProjectsStackNavigator() {
  return (
    <Stack.Navigator>
      <Stack.Screen
        name="ProjectsList"
        component={Screens.Projects.component}
        options={{ headerShown: false }}
      />

      <Stack.Screen
        name="ProjectDetails"
        component={ProjectDetails}
        options={{
          header: () => <ProjectsHeader />,
        }}
      />

      <Stack.Screen
        name="PlotNotesDetails"
        component={PlotNotesDetails}
        options={{ headerShown: false }}
      />

      <Stack.Screen
        name="PlotNoteEditor"
        component={PlotNoteEditorScreen}
        options={{ headerShown: false }}
      />

      <Stack.Screen
        name="ObservationDetails"
        component={ObservationDetails}
        options={{ headerShown: false }}
      />
    </Stack.Navigator>
  );
}

export default function RootNavigator() {
  const token = useAuthStore(state => state.user?.token);

  useEffect(() => {
    if (!token) {
      stopMobilePhotoStreaming('auth-missing');
      return undefined;
    }
    startMobilePhotoStreaming();
    return () => stopMobilePhotoStreaming('root-unmount-or-auth-change');
  }, [token]);

  return (
    <Tab.Navigator
      initialRouteName="Home"
      screenOptions={{ headerShown: false }}
      tabBar={props => <FloatingTabs {...props} />}
    >
      <Tab.Screen name="Home" component={Screens.Home.component} />

      <Tab.Screen name="Projects" component={ProjectsStackNavigator} />

      <Tab.Screen name="Diary" component={Screens.Diary.component} />

      <Tab.Screen name="Photos" component={Screens.Photos.component} />
    </Tab.Navigator>
  );
}
