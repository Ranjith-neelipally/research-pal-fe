import styled from 'styled-components/native';
import { Theme } from '../theme';

export const InputContainer = styled.View<{ active?: boolean }>`
  gap: 8px;
  min-width: 50px;
`;

export const StyledInputContainer = styled.View<{ active?: boolean }>`
  width: 100%;
  flex-direction: row;
  align-items: center;
  background-color: #272c35;
  padding: 0 12px;
  border-width: 2px;
  border-color: ${props =>
    props.active ? Theme.colors.primary : 'transparent'};
  border-radius: 8px;
  gap: 8px;
`;

export const StyledInput = styled.TextInput`
  height: 50px;
  flex: 1;
  color: #e7ebef;
  font-size: 16px;
`;
