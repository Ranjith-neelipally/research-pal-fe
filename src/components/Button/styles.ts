import styled from 'styled-components/native';
import { Theme } from '../theme';
interface ButtonProps {
  variant?: 'primary' | 'secondary' | 'tertiary' | 'rounded';
}

export const StyledButton = styled.TouchableOpacity<ButtonProps>`
  background-color: ${props =>
    props.variant === 'secondary'
      ? Theme.colors.backgroundSecondary
      : props.variant === 'tertiary'
      ? 'transparent'
      : Theme.colors.primary};
  padding: 12px 0;
  border-radius: 8px;
  align-items: center;
  justify-content: center;
  min-width: 80px;
  border-radius: ${props => (props.variant === 'rounded' ? '50px' : '8px')};
  opacity: ${props => (props.disabled ? 0.6 : 1)};
`;

export const ButtonText = styled.Text<ButtonProps>`
  color: ${props =>
    props.variant === 'secondary'
      ? Theme.colors.fontSecondary
      : props.variant === 'tertiary'
      ? Theme.colors.primary
      : Theme.colors.fontPrimary};
  font-size: ${props => (props.variant === 'tertiary' ? '14px' : '16px')};
  font-weight: 500;
`;
