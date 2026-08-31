import styled from 'styled-components/native';
import { Theme } from '../theme';

export const StyledAddNewButton = styled.TouchableOpacity<{
  $inline?: boolean;
  $floating?: boolean;
  $bottomOffset?: number;
}>`
  width: 60px;
  height: 60px;
  background-color: ${Theme.colors.primary};
  align-items: center;
  justify-content: center;
  border-radius: 999px;
  ${({ $inline, $floating, $bottomOffset }) =>
    $floating
      ? `
          position: absolute;
          right: 16px;
          bottom: ${$bottomOffset ?? 24}px;
          z-index: 100;
        `
      : $inline
      ? ''
      : `
          position: absolute;
          left: 100%;
          bottom: 170%;
        `}
  elevation: 10;
  shadow-color: ${Theme.colors.primary};
  shadow-opacity: 0.35;
  shadow-radius: 8px;
  shadow-offset: 0px 4px;
`;
