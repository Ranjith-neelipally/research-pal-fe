import React from 'react';
import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { CommonActions } from '@react-navigation/native';
import { Screens } from '../helpers';
import { Tab, Bar, TabText } from './styles';
import { useAddNewButtonActionsStore } from '../../../store/addNew.store';
import AddNew from '../../../components/AddNew';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function FloatingTabs(props: BottomTabBarProps) {
  const insets = useSafeAreaInsets();
  const isAddNewButtonActionsVisible = useAddNewButtonActionsStore(
    state => state.isAddNewButtonActionsVisible,
  );
  const activeRoute = props.state.routes[props.state.index];
  const projectsRoute = props.state.routes.find(route => route.name === 'Projects');
  const projectsStackState = projectsRoute?.state;
  const isPhotosFocused = activeRoute?.name === 'Photos';

  const navigateToProjectsList = () => {
    const projectsRouteIndex = projectsStackState?.index ?? 0;
    const projectsNestedRoute = projectsStackState?.routes?.[projectsRouteIndex];
    if (activeRoute?.name === 'Projects' && projectsNestedRoute?.name === 'ProjectsList') {
      return;
    }

    props.navigation.dispatch(
      CommonActions.navigate({
        name: 'Projects',
        params: { screen: 'ProjectsList' },
      }),
    );
  };

  return (
    <Bar style={{ bottom: Math.max(16, insets.bottom) }}>
      {props.state.routes.map((route, idx) => {
        const focused = props.state.index === idx;
        const screen = Screens[route.name];
        const Icon = screen?.Icon;

        return (
          <Tab
            key={route.key}
            onPress={() => {
              const event = props.navigation.emit({
                type: 'tabPress',
                target: route.key,
                canPreventDefault: true,
              });

              if (event.defaultPrevented) {
                return;
              }

              if (route.name === 'Projects') {
                navigateToProjectsList();
                return;
              }

              if (!focused) {
                props.navigation.navigate(route.name);
              }
            }}
            accessibilityRole="button"
            accessibilityState={focused ? { selected: true } : {}}
            accessibilityLabel={
              props.descriptors[route.key].options.tabBarAccessibilityLabel
            }
            isSelected={focused}
          >
            {Icon && <Icon size={20} color={focused ? '#101318' : '#7b899d'} />}
            {screen.name && (
              <TabText isSelected={focused}>{screen.name}</TabText>
            )}
          </Tab>
        );
      })}
      {isAddNewButtonActionsVisible && !isPhotosFocused && <AddNew />}
    </Bar>
  );
}
