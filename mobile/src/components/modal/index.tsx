import React from 'react';
import {
  Modal,
  Pressable,
  View,
  TouchableWithoutFeedback,
  StyleSheet,
  StyleProp,
  ViewStyle,
  KeyboardAvoidingView,
  Platform,
  Keyboard,
  useWindowDimensions,
} from 'react-native';
import {
  BottomPlacementStyles,
  ModalContent,
  ModalHeader,
  OverlayStyles,
} from './styles';
import { BlurView } from '@react-native-community/blur';
import { X } from 'lucide-react-native/icons';
import { Theme } from '../theme';
import { useKeyboardInsets } from '../../hooks/useKeyboardInsets';
import { SafeAreaInsetsContext } from 'react-native-safe-area-context';

export interface MyModalProps {
  visible: boolean;
  onClose: () => void;
  children?: React.ReactNode;
  placement?: 'top' | 'center' | 'bottom';
  modalHeader?: string;
  contentStyle?: StyleProp<ViewStyle>;
  keyboardAware?: boolean;
}

const MyModal = ({
  visible,
  onClose,
  children,
  placement = 'center',
  modalHeader,
  contentStyle,
  keyboardAware = false,
}: MyModalProps) => {
  const { height: screenHeight } = useWindowDimensions();
  const insets = React.useContext(SafeAreaInsetsContext) ?? {
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
  };
  const { keyboardInset, keyboardVisible } = useKeyboardInsets();
  const topSafeBoundary = insets.top + 12;
  const maxKeyboardAwareHeight = Math.max(120, screenHeight - keyboardInset - topSafeBoundary);

  const closeOrDismissKeyboard = () => {
    if (keyboardAware && keyboardVisible) {
      Keyboard.dismiss();
      return;
    }
    onClose();
  };

  const renderHeader = () => {
    if (modalHeader) {
      return (
        <View
          style={{
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: 16,
          }}
        >
          <ModalHeader>{modalHeader}</ModalHeader>
          <TouchableWithoutFeedback onPress={closeOrDismissKeyboard}>
            <X size={20} color={Theme.colors.mutedForeground} />
          </TouchableWithoutFeedback>
        </View>
      );
    }
    return null;
  };

  return (
    <View>
      <Modal
        visible={visible}
        transparent
        animationType="fade"
        onRequestClose={closeOrDismissKeyboard}
        statusBarTranslucent
      >
        <OverlayStyles>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Close modal"
            onPress={closeOrDismissKeyboard}
            style={StyleSheet.absoluteFill}
          >
            <BlurView
              style={StyleSheet.absoluteFill}
              blurType="dark"
              blurAmount={4}
              reducedTransparencyFallbackColor="white"
              pointerEvents="none"
            />
          </Pressable>
          {keyboardAware ? <KeyboardAvoidingView
              behavior={Platform.OS === 'ios' ? 'padding' : undefined}
              pointerEvents="box-none"
              style={StyleSheet.absoluteFill}
            >
              <View
                pointerEvents="box-none"
                style={[
                  StyleSheet.absoluteFill,
                  { paddingTop: topSafeBoundary },
                  placement !== 'bottom' && styles.centeredContent,
                ]}
              >
                {placement === 'bottom' ? (
                  <BottomPlacementStyles
                    style={[
                      contentStyle,
                      {
                        bottom: keyboardInset,
                        ...(keyboardVisible ? { maxHeight: maxKeyboardAwareHeight } : {}),
                      },
                    ]}
                  >
                    {modalHeader && renderHeader()}
                    {children}
                  </BottomPlacementStyles>
                ) : (
                  <ModalContent
                    style={[
                      contentStyle,
                      keyboardVisible ? { maxHeight: maxKeyboardAwareHeight } : undefined,
                    ]}
                  >
                    <View style={{ justifyContent: 'space-between' }}>
                      {modalHeader && renderHeader()}
                    </View>
                    {children}
                  </ModalContent>
                )}
              </View>
            </KeyboardAvoidingView> : <View
              pointerEvents="box-none"
              style={[
                StyleSheet.absoluteFill,
                placement !== 'bottom' && styles.centeredContent,
              ]}
            >
              {placement === 'bottom' ? (
                <BottomPlacementStyles style={contentStyle}>
                  {modalHeader && renderHeader()}
                  {children}
                </BottomPlacementStyles>
              ) : (
                <ModalContent style={contentStyle}>
                  <View style={{ justifyContent: 'space-between' }}>
                    {modalHeader && renderHeader()}
                  </View>
                  {children}
                </ModalContent>
              )}
            </View>}
        </OverlayStyles>
      </Modal>
    </View>
  );
};

export default MyModal;

const styles = StyleSheet.create({
  centeredContent: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});
