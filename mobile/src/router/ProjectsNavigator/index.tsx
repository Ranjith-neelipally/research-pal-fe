import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { Screens } from './helpers';

import ProjectsHeader from './ProjectsHeader';

const Stack = createNativeStackNavigator();

export default function ProjectsNavigator() {
  return (
    <Stack.Navigator
      initialRouteName="ProjectTitle"
      screenOptions={{ header: () => <ProjectsHeader /> }}
    >
      {Object.values(Screens).map((screen, index) => (
        <Stack.Screen
          key={screen.name}
          name={screen.name}
          component={screen.component}
        />
      ))}
    </Stack.Navigator>
  );
}
