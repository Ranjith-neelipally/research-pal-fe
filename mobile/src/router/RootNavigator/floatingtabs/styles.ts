import styled from 'styled-components/native';
import { Theme } from '../../../components/theme';

type TabProps = {
  isSelected?: boolean;
};

const commonRadius = '999px';

export const Tab = styled.TouchableOpacity<TabProps>`
  background-color: ${({ isSelected }) =>
    isSelected ? Theme.colors.primary : 'transparent'};
  height: 100%;
  align-items: center;
  justify-content: center;
  padding: 8px 12px;
  border-radius: ${commonRadius};
  gap: 2px;
  min-width: 60px;
`;

export const TabText = styled.Text<TabProps>`
  color: ${({ isSelected }) => (isSelected ? '#101318' : '#7b899d')};
  font-size: 10px;
  font-weight: 500;
`;

export const Bar = styled.View`
  padding: 8px;
  position: absolute;
  flex-direction: row;
  bottom: 16px;

  border-radius: ${commonRadius};
  background: #191d24f2;
  border: 1px solid #2b303b80;
  flex: 1;
  align-self: center;
  align-items: center;
  justify-content: space-around;
  gap: 12px;
  elevation: 8;
  shadow-color: #000;
  shadow-opacity: 0.1;
  shadow-radius: 8px;
  shadow-offset: 0px 2px;
`;
