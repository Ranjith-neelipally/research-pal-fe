import styled from 'styled-components/native';
import { Theme } from '../../../../components/theme';

const buttonDimensions = '28px';

export const StyledButton = styled.TouchableOpacity`
  background-color: ${Theme.colors.backgroundSecondary};
  width: ${buttonDimensions};
  height: ${buttonDimensions};
  justify-content: center;
  border-radius: 999px;
  align-items: center;
`;

export const ActivitiesHeaderContainer = styled.View`
  flex-direction: row;
  align-items: center;
  gap: 8px;
`;

export const MoreOptionsCard = styled.View`
  /* position: absolute; */
  right: 20px;
  /* top: -30px; */
  background-color: ${Theme.colors.backgroundSecondary};
  display: flex;
  flex-direction: column;
  padding: 8px;
  z-index: 1;
  elevation: 10;
  width: 85px;
  border-radius: 8px;
  border: 2px solid ${Theme.colors.backgroundSecondary};
  z-index: 10;
`;

export const MoreOption = styled.Pressable`
  flex-direction: row;
  align-items: center;
  gap: 4px;
  padding: 4px;
`;
