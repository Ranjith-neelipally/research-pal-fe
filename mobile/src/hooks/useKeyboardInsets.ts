import { useEffect, useState } from 'react';
import { Keyboard, Platform, useWindowDimensions } from 'react-native';

const KEYBOARD_GAP = 20;

export function useKeyboardInsets() {
  const { height } = useWindowDimensions();
  const [keyboardHeight, setKeyboardHeight] = useState(0);

  useEffect(() => {
    const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';
    const shown = Keyboard.addListener(showEvent, event => {
      const keyboardTop = event.endCoordinates?.screenY ?? height;
      setKeyboardHeight(Math.max(0, height - keyboardTop));
    });
    const hidden = Keyboard.addListener(hideEvent, () => setKeyboardHeight(0));

    return () => {
      shown.remove();
      hidden.remove();
    };
  }, [height]);

  return {
    keyboardHeight,
    keyboardVisible: keyboardHeight > 0,
    keyboardGap: KEYBOARD_GAP,
    keyboardInset: keyboardHeight ? keyboardHeight + KEYBOARD_GAP : 0,
  };
}
