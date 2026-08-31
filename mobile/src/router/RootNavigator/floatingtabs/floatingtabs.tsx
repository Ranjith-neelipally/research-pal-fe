import React from 'react';
import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';
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
      {isAddNewButtonActionsVisible && <AddNew />}
    </Bar>
  );
}
