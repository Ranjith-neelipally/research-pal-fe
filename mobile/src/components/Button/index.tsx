import { View, Text } from 'react-native';
import React from 'react';
import { ButtonText, StyledButton } from './styles';
import { MutedText } from '../commonStyles/styles';

export interface ButtonProps extends React.ComponentProps<typeof StyledButton> {
  Icon?: React.ReactNode;
  label?: string;
  variant?: 'primary' | 'secondary' | 'tertiary' | 'rounded';
}

const Button = (props: ButtonProps) => {
  return (
    <StyledButton {...props}>
      <ButtonText variant={props.variant}> {props.children}</ButtonText>
    </StyledButton>
  );
};

export default Button;
