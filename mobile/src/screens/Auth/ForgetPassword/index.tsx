import React, { useEffect, useRef, useState } from 'react';
import {
  Alert,
  Image,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  TouchableWithoutFeedback,
  View,
} from 'react-native';
import { NavigationProp, useNavigation } from '@react-navigation/native';
import { Mail } from 'lucide-react-native';
import Button from '../../../components/Button';
import Input from '../../../components/Input';
import { H1, MutedText } from '../../../components/commonStyles/styles';
import { IconContainer, LoginForm, LoginScreen, LogoAndTitle } from '../Login/styles';
import { showApiErrorAlert } from '../../../services/apiError';
import { requestPasswordReset } from '../../../services/passwordReset';
import { validateEmail } from '../../../utils/authValidation';
import { useKeyboardInsets } from '../../../hooks/useKeyboardInsets';

const ForgetPassword = () => {
  const navigation = useNavigation<NavigationProp<any>>();
  const scrollRef = useRef<React.ElementRef<typeof ScrollView>>(null);
  const [email, setEmail] = useState('');
  const [emailError, setEmailError] = useState<string | undefined>();
  const [isLoading, setIsLoading] = useState(false);
  const [requestSent, setRequestSent] = useState(false);
  const { keyboardInset, keyboardVisible } = useKeyboardInsets();

  const keepFormVisible = () => {
    requestAnimationFrame(() => {
      scrollRef.current?.scrollToEnd({ animated: true });
    });
  };

  useEffect(() => {
    const showSubscription = Keyboard.addListener('keyboardDidShow', () => {
      setTimeout(keepFormVisible, 80);
    });
    const hideSubscription = Keyboard.addListener('keyboardDidHide', () => {
      scrollRef.current?.scrollTo({ y: 0, animated: true });
    });

    return () => {
      showSubscription.remove();
      hideSubscription.remove();
    };
  }, []);

  const goToLogin = () => {
    navigation.navigate('Login' as never);
  };

  const handleSubmit = async () => {
    const nextEmailError = validateEmail(email);
    setEmailError(nextEmailError);
    if (nextEmailError) return;

    setIsLoading(true);
    try {
      await requestPasswordReset(email.trim());
      setRequestSent(true);
      Alert.alert(
        'Check your email',
        'If an account exists for that email, password reset instructions have been sent.',
      );
    } catch (error) {
      showApiErrorAlert('Unable to send reset link', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <LoginScreen>
      <KeyboardAvoidingView
        style={{ flex: 1, width: '100%' }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 12 : 0}
      >
        <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
          <ScrollView
            ref={scrollRef}
            contentContainerStyle={{
              flexGrow: 1,
              justifyContent: 'center',
              paddingBottom: keyboardVisible ? keyboardInset : 24,
            }}
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode="interactive"
            showsVerticalScrollIndicator={false}
            automaticallyAdjustKeyboardInsets={Platform.OS === 'ios'}
          >
            <View style={{ width: '85%', alignSelf: 'center' }}>
              <LogoAndTitle>
                <IconContainer>
                  <Image
                    source={require('../../../assets/images/logo.png')}
                    style={{ width: 56, height: 56 }}
                    resizeMode="contain"
                  />
                </IconContainer>
                <H1>Forgot Password</H1>
                <MutedText>
                  Enter your email and ResearchPal will send password reset instructions.
                </MutedText>
              </LogoAndTitle>
              <LoginForm>
                <Input
                  Icon={<Mail size={20} color={'#7b899d'} />}
                  label="Email"
                  placeholder="you@example.com"
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoCorrect={false}
                  editable={!isLoading}
                  onFocus={keepFormVisible}
                  onChangeText={text => {
                    setEmail(text);
                    if (emailError) setEmailError(undefined);
                    if (requestSent) setRequestSent(false);
                  }}
                  value={email}
                  error={emailError}
                />
                {requestSent ? (
                  <MutedText>
                    If an account exists for this email, a reset link has been sent.
                  </MutedText>
                ) : null}
                <Button onPress={handleSubmit} disabled={isLoading}>
                  {isLoading ? 'Sending...' : 'Send Reset Link'}
                </Button>
                <Button variant="tertiary" onPress={goToLogin} disabled={isLoading}>
                  Back to Login
                </Button>
              </LoginForm>
            </View>
          </ScrollView>
        </TouchableWithoutFeedback>
      </KeyboardAvoidingView>
    </LoginScreen>
  );
};

export default ForgetPassword;
