import React from 'react';
import {
  Modal,
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
        <TouchableWithoutFeedback onPress={onClose}>
          <OverlayStyles>
            <BlurView
              style={StyleSheet.absoluteFill}
              blurType="dark"
              blurAmount={4}
              reducedTransparencyFallbackColor="white"
            />
            {keyboardAware ? <KeyboardAvoidingView
              behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
              pointerEvents="box-none"
              style={StyleSheet.absoluteFill}
            >
              <TouchableWithoutFeedback>
                <BottomPlacementStyles style={contentStyle}>
                  {modalHeader && renderHeader()}
                  {children}
                </BottomPlacementStyles>
              </TouchableWithoutFeedback>
            </KeyboardAvoidingView> : <TouchableWithoutFeedback>
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
            </TouchableWithoutFeedback>}
          </OverlayStyles>
        </TouchableWithoutFeedback>
      </Modal>
    </View>
  );
};

export default MyModal;
