import styled from 'styled-components/native';
import { Theme } from '../../../components/theme';

export const Tabs = styled.View`
  flex-direction: row;
  margin-top: 16px;
  background-color: ${Theme.colors.backgroundSecondary};
  padding: 4px;
  border-radius: 99px;
`;

export const TabButton = styled.Pressable<{ active: boolean }>`
  flex: 1;
  padding: 8px 16px;
  border-radius: 99px;
  background-color: ${props =>
    props.active ? Theme.colors.primary : 'transparent'};
  align-items: center;
`;

export const TabButtonText = styled.Text<{ active: boolean }>`
  color: ${props =>
    props.active ? Theme.colors.background : Theme.colors.mutedForeground};
`;

export const PillPrimary = styled.View`
  background-color: ${Theme.colors.primary};
  padding: 4px 8px;
  border-radius: 99px;
  align-self: flex-start;
`;

export const PillPrimaryText = styled.Text`
  color: ${Theme.colors.background};
  font-size: 12px;
`;

export const PillSecondary = styled.View`
  background-color: ${Theme.colors.backgroundSecondary};
  padding: 4px 8px;
  border-radius: 99px;
  align-self: flex-start;
`;

export const PillSecondaryText = styled.Text`
  color: ${Theme.colors.fontSecondary};
  font-size: 12px;
`;
