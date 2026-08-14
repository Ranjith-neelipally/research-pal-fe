import { View, Pressable } from 'react-native';
import React from 'react';
import { H1, MutedText } from '../commonStyles/styles';
import { SettingsIcon } from 'lucide-react-native';
import { useNavigation } from '@react-navigation/native';

interface ScreenHeaderProps {
  title?: string;
  subtitle?: string;
}

const ScreenHeader = ({ title, subtitle }: ScreenHeaderProps) => {
  const navigation = useNavigation<any>();
  const openSettings = () => {
    let root = navigation;
    while (root.getParent?.()) root = root.getParent();
    root.navigate('Settings');
  };
  return (
    <View
      style={{
        display: 'flex',
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
      }}
    >
      <View>
        <H1>{title || 'ResearchPal'}</H1>
        <MutedText>{subtitle || 'Welcome to ResearchPal'}</MutedText>
      </View>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Open Settings"
        hitSlop={8}
        onPress={openSettings}
        style={({ pressed }) => ({ padding: 10, marginRight: -6, opacity: pressed ? 0.6 : 1 })}
      >
        <SettingsIcon color="#e7ebef" size={22} />
      </Pressable>
    </View>
  );
};

export default ScreenHeader;
