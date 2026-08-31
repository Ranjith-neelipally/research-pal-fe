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
          <TouchableWithoutFeedback onPress={onClose}>
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
        onRequestClose={onClose}
        statusBarTranslucent
      >
        <OverlayStyles>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Close modal"
            onPress={onClose}
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
              behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
              pointerEvents="box-none"
              style={StyleSheet.absoluteFill}
            >
              <View pointerEvents="box-none" style={StyleSheet.absoluteFill}>
                <BottomPlacementStyles style={contentStyle}>
                  {modalHeader && renderHeader()}
                  {children}
                </BottomPlacementStyles>
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
