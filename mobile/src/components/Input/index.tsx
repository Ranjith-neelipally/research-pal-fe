import React, { forwardRef, useState } from 'react';
import { TextInput, Text } from 'react-native';
import { InputContainer, StyledInputContainer } from './styles';
import { MutedText } from '../commonStyles/styles';

interface InputProps extends React.ComponentProps<typeof TextInput> {
  label?: string;
  error?: string;
  Icon?: React.ReactNode;
  IconRight?: React.ReactNode;
}

const Input = forwardRef<TextInput, InputProps>((props, ref) => {
  const [active, setActive] = useState(false);

  return (
    <InputContainer style={props.style}>
      {props.label && <MutedText>{props.label}</MutedText>}
      <StyledInputContainer
        active={active}
        style={
          props.multiline
            ? {
                flex: 1,
                alignItems: 'stretch',
                paddingVertical: 12,
              }
            : undefined
        }
      >
        {props.Icon && props.Icon}
        <TextInput
          {...props}
          ref={ref}
          style={[
            {
              height: props.multiline ? '100%' : 50,
              flex: 1,
              color: '#e7ebef',
              fontSize: 16,
            },
            props.style,
          ]}
          placeholderTextColor={'#7b899d'}
          onFocus={e => {
            setActive(true);
            props.onFocus?.(e);
          }}
          onBlur={e => {
            setActive(false);
            props.onBlur?.(e);
          }}
        />
        {props.IconRight && props.IconRight}
      </StyledInputContainer>
      {props.error && <Text style={{ color: 'red' }}>{props.error}</Text>}
    </InputContainer>
  );
});

export default Input;
