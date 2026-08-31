import { View, Text, Keyboard, ScrollView, TouchableWithoutFeedback, TextInput, TouchableOpacity, Image } from 'react-native'
import React, { useState, useRef } from 'react'
import { Screen } from 'react-native-screens';
import { H1, MutedText } from '../../../components/commonStyles/styles';
import Input from '../../../components/Input';
import { Theme } from '../../../components/theme';
import { LoginScreen, LogoAndTitle, IconContainer, LoginForm } from '../Login/styles';
import { handleAccountVerification } from '../../../services/login';
import { useNavigation } from '@react-navigation/native';
import LoadingState from '../../../components/LoadingState';
import { showApiErrorAlert } from '../../../services/apiError';


const VerificationScreen = () => {
    const navigation = useNavigation();
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [isVerifying, setIsVerifying] = useState(false);
  const inputs = useRef<(React.ElementRef<typeof TextInput> | null)[]>([]);

  const handleOtpChange = (text: string, index: number) => {
    if (text.length > 1) return; // Only allow single digit

    const newOtp = [...otp];
    newOtp[index] = text;
    setOtp(newOtp);

    if (text && index < otp.length - 1) {
      inputs.current[index + 1]?.focus();
    }
  };

  const handleOtpKeyPress = (key: string, index: number) => {
    if (key !== 'Backspace') return;

    if (otp[index] !== '') {
      const newOtp = [...otp];
      newOtp[index] = '';
      setOtp(newOtp);
      if (index > 0) {
        setTimeout(() => inputs.current[index - 1]?.focus(), 0);
      }
      return;
    }

    if (index > 0) {
      const newOtp = [...otp];
      newOtp[index - 1] = '';
      setOtp(newOtp);
      setTimeout(() => inputs.current[index - 1]?.focus(), 0);
    }
  };

  const handleVerify = async() => {
    const otpValue = otp.join('');
    setIsVerifying(true);
    try {
      const res = await handleAccountVerification(otpValue);
      if (res && res.status === 200) {
        navigation.navigate('Login' as never);
      }
    } catch (error) {
      showApiErrorAlert('Verification failed', error);
    } finally {
      setIsVerifying(false);
    }
  };

  return (
    <ScrollView
      style={{ flex: 1 }}
      contentContainerStyle={{
        flexGrow: 1,
      }}
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}
    >
      <LoginScreen>
        <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
          <Screen>
            <LogoAndTitle>
              <IconContainer>
                <Image
                  source={require('../../../assets/images/logo.png')}
                  style={{ width: 56, height: 56 }}
                  resizeMode="contain"
                />
              </IconContainer>
              <H1>Verify Account</H1>
              <MutedText>Enter the 6-digit code sent to your email.</MutedText>
            </LogoAndTitle>
            <LoginForm>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 20, gap: 10 }}>
                {otp.map((digit, index) => (
                  <Input
                    key={index}
                    ref={(ref) => { inputs.current[index] = ref; }}
                    keyboardType="numeric"
                    maxLength={1}
                    value={digit}
                    onChangeText={(text) => handleOtpChange(text, index)}
                    onKeyPress={({ nativeEvent }) => handleOtpKeyPress(nativeEvent.key, index)}
                  />
                ))}
              </View>
              <TouchableOpacity
                style={{
                  backgroundColor: Theme.colors.primary,
                  padding: 10,
                  borderRadius: 5,
                  alignItems: 'center',
                  marginBottom: 10,
                }}
                onPress={handleVerify}
                disabled={isVerifying}
              >
                <Text style={{ color: 'white', fontSize: 16 }}>
                  {isVerifying ? 'Verifying...' : 'Verify'}
                </Text>
              </TouchableOpacity>
              {isVerifying && <LoadingState label="Checking your code..." />}
              {/* <TouchableOpacity
                style={{
                  padding: 10,
                  alignItems: 'center',
                }}
                onPress={handleResend}
              >
                <Text style={{ color: Theme.colors.primary, fontSize: 16 }}>Resend OTP</Text>
              </TouchableOpacity> */}
            </LoginForm>
          </Screen>
        </TouchableWithoutFeedback>
      </LoginScreen>
    </ScrollView>
  )
}

export default VerificationScreen
