import { View, Text, Settings } from 'react-native';
import React from 'react';
import { H1, MutedText } from '../commonStyles/styles';
import { SettingsIcon } from 'lucide-react-native';

interface ScreenHeaderProps {
  title?: string;
  subtitle?: string;
}

const ScreenHeader = ({ title, subtitle }: ScreenHeaderProps) => {
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
      <SettingsIcon color="#e7ebef" />
    </View>
  );
};

export default ScreenHeader;
