import React from 'react';
import { ActivityIndicator, View } from 'react-native';
import { MutedText } from '../commonStyles/styles';
import { Theme } from '../theme';

interface LoadingStateProps {
  label?: string;
  fullScreen?: boolean;
}

const LoadingState = ({
  label = 'Loading...',
  fullScreen = false,
}: LoadingStateProps) => {
  return (
    <View
      style={{
        flex: fullScreen ? 1 : undefined,
        minHeight: fullScreen ? undefined : 120,
        alignItems: 'center',
        justifyContent: 'center',
        gap: 12,
        width: '100%',
      }}
    >
      <ActivityIndicator size="large" color={Theme.colors.primary} />
      <MutedText>{label}</MutedText>
    </View>
  );
};

export default LoadingState;
