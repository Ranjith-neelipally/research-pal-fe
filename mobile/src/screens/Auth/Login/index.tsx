import {
  View,
  TouchableWithoutFeedback,
  Keyboard,
  Image,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import React, { useEffect, useRef, useState } from 'react';
import { LoginScreen, IconContainer, LogoAndTitle, LoginForm } from './styles';
import { H1, MutedText } from '../../../components/commonStyles/styles';
import { Mail, Lock, EyeOff, Eye } from 'lucide-react-native';
import Input from '../../../components/Input';
import Button from '../../../components/Button';
import { loginService } from '../../../services/login';
import { NavigationProp, useNavigation } from '@react-navigation/native';
import { showApiErrorAlert } from '../../../services/apiError';
import { validateBackendPassword, validateEmail } from '../../../utils/authValidation';
const Login = () => {
  const navigation = useNavigation<NavigationProp<any>>();
  const scrollRef = useRef<React.ElementRef<typeof ScrollView>>(null);
  const focusedFieldRef = useRef<'email' | 'password' | null>(null);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [keyboardVisible, setKeyboardVisible] = useState(false);
  const [errors, setErrors] = useState<{ email?: string; password?: string }>(
    {},
  );

  const validateForm = () => {
    const newErrors: { email?: string; password?: string } = {};

    newErrors.email = validateEmail(email);
    newErrors.password = validateBackendPassword(password);

    setErrors(newErrors);
    return Object.values(newErrors).every(error => !error);
  };

  const handleLogin = async () => {
    if (!validateForm()) return;
    setIsLoading(true);
    try {
      await loginService(email.trim(), password.trim());
      navigation.reset({
        index: 0,
        routes: [{ name: 'Main' }],
      });
    } catch (err: any) {
      showApiErrorAlert('Login failed', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSignUp = () => {
    navigation.navigate('SignUp' as never);
  };

  const keepFocusedInputVisible = () => {
    if (focusedFieldRef.current !== 'password') return;

    requestAnimationFrame(() => {
      scrollRef.current?.scrollToEnd({ animated: true });
    });
  };

  const handleEmailFocus = () => {
    focusedFieldRef.current = 'email';
  };

  const handlePasswordFocus = () => {
    focusedFieldRef.current = 'password';
    keepFocusedInputVisible();
  };

  useEffect(() => {
    const showSubscription = Keyboard.addListener('keyboardDidShow', () => {
      setKeyboardVisible(true);
      setTimeout(keepFocusedInputVisible, 80);
    });
    const hideSubscription = Keyboard.addListener('keyboardDidHide', () => {
      setKeyboardVisible(false);
      focusedFieldRef.current = null;
      scrollRef.current?.scrollTo({ y: 0, animated: true });
    });

    return () => {
      showSubscription.remove();
      hideSubscription.remove();
    };
  }, []);

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
              paddingBottom: keyboardVisible ? 260 : 0,
            }}
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode="interactive"
            showsVerticalScrollIndicator={false}
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
                <H1>Welcome Back</H1>
                <MutedText>Sign in to continue your research.</MutedText>
              </LogoAndTitle>
              <LoginForm>
                <Input
                  Icon={<Mail size={20} color={'#7b899d'} />}
                  label="Email"
                  placeholder="you@example.com"
                  keyboardType="email-address"
                  onFocus={handleEmailFocus}
                  onChangeText={text => {
                    setEmail(text);
                    if (errors.email) {
                      setErrors(prev => ({ ...prev, email: undefined }));
                    }
                  }}
                  value={email}
                  error={errors.email}
                />
                <Input
                  Icon={<Lock size={20} color={'#7b899d'} />}
                  label="Password"
                  placeholder="••••••••"
                  secureTextEntry={!showPassword}
                  onFocus={handlePasswordFocus}
                  IconRight={
                    <TouchableWithoutFeedback
                      onPress={() => setShowPassword(!showPassword)}
                    >
                      {showPassword ? (
                        <EyeOff size={20} color={'#7b899d'} />
                      ) : (
                        <Eye size={20} color={'#7b899d'} />
                      )}
                    </TouchableWithoutFeedback>
                  }
                  onChangeText={text => {
                    setPassword(text);
                    if (errors.password) {
                      setErrors(prev => ({ ...prev, password: undefined }));
                    }
                  }}
                  value={password}
                  error={errors.password}
                />
                <View>
                  <View style={{ alignItems: 'flex-end' }}>
                    <Button variant="tertiary">Forgot password? </Button>
                  </View>
                  <Button onPress={handleLogin} disabled={isLoading}>
                    {isLoading ? 'Signing In...' : 'Sign In'}
                  </Button>
                </View>
                <View
                  style={{
                    flexDirection: 'row',
                    justifyContent: 'center',
                    alignItems: 'baseline',
                  }}
                >
                  <MutedText>Don't have an account?</MutedText>
                  <Button variant="tertiary" onPress={handleSignUp}>
                    Sign Up
                  </Button>
                </View>
              </LoginForm>
            </View>
          </ScrollView>
        </TouchableWithoutFeedback>
      </KeyboardAvoidingView>
    </LoginScreen>
  );
};

export default Login;
