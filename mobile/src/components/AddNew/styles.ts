import styled from 'styled-components/native';
import { Theme } from '../theme';

export const StyledAddNewButton = styled.TouchableOpacity`
  width: 60px;
  height: 60px;
  background-color: ${Theme.colors.primary};
  align-items: center;
  justify-content: center;
  border-radius: 999px;
  position: absolute;
  left: 100%;
  bottom: 170%;
  elevation: 10;
  shadow-color: ${Theme.colors.primary};
`;
