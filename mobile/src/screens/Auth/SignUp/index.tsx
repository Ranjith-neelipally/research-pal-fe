import {
  View,
  TouchableWithoutFeedback,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Image,
} from 'react-native';
import React, { useEffect, useRef, useState } from 'react';
import {
  LoginScreen,
  IconContainer,
  LogoAndTitle,
  LoginForm,
} from '../Login/styles';
import { H1, MutedText, Screen } from '../../../components/commonStyles/styles';
import {
  Mail,
  Lock,
  EyeOff,
  Eye,
  User,
  AtSign,
} from 'lucide-react-native';
import Input from '../../../components/Input';
import Button from '../../../components/Button';
import { SignUp } from '../../../services/login';
import { showApiErrorAlert } from '../../../services/apiError';
import { useNavigation } from '@react-navigation/native';
import {
  validateBackendPassword,
  validateEmail,
  validateRequired,
} from '../../../utils/authValidation';
const Login = () => {
  const navigation = useNavigation();
  const scrollRef = useRef<React.ElementRef<typeof ScrollView>>(null);

  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [keyboardVisible, setKeyboardVisible] = useState(false);
  const [errors, setErrors] = useState<{
    firstName?: string;
    lastName?: string;
    username?: string;
    email?: string;
    password?: string;
    confirmPassword?: string;
  }>({});

  const validateForm = () => {
    const newErrors: {
      firstName?: string;
      lastName?: string;
      username?: string;
      email?: string;
      password?: string;
      confirmPassword?: string;
    } = {};

    newErrors.firstName = validateRequired(firstName, 'First name is required.');
    newErrors.lastName = validateRequired(lastName, 'Last name is required.');
    newErrors.username = validateRequired(username, 'Username is required.');
    if (username.trim().length > 0 && username.trim().length < 3) {
      newErrors.username = 'Username must be at least 3 characters.';
    } else if (username.trim().length > 20) {
      newErrors.username = 'Username must be 20 characters or fewer.';
    }
    newErrors.email = validateEmail(email);
    newErrors.password = validateBackendPassword(password);

    if (!confirmPassword) {
      newErrors.confirmPassword = 'Please confirm your password.';
    } else if (password.trim() !== confirmPassword.trim()) {
      newErrors.confirmPassword = 'Passwords do not match.';
    }

    setErrors(newErrors);
    return Object.values(newErrors).every(error => !error);
  };

  const handleSignUp = async () => {
    if (!validateForm()) return;
    setIsLoading(true);
    try {
      const payload = {
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        email: email.trim(),
        password: password.trim(),
        userName: username.trim(),
        createdDate: new Date().toISOString(),
      };
      const response = await SignUp(payload);
      if (response.responseStatus === 201) {
        navigation.navigate('VerificationScreen' as never);
      }
      setIsLoading(false);
    } catch (error: any) {
      showApiErrorAlert('Sign Up Failed', error, 'An error occurred during sign up.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSignIn = () => {
    navigation.navigate('Login' as never);
  };

  const scrollLowerFieldsIntoView = () => {
    requestAnimationFrame(() => {
      scrollRef.current?.scrollToEnd({ animated: true });
    });
  };

  useEffect(() => {
    const showSubscription = Keyboard.addListener('keyboardDidShow', () => {
      setKeyboardVisible(true);
      setTimeout(scrollLowerFieldsIntoView, 80);
    });
    const hideSubscription = Keyboard.addListener('keyboardDidHide', () => {
      setKeyboardVisible(false);
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
        <ScrollView
          ref={scrollRef}
          style={{ flex: 1 }}
          contentContainerStyle={{
            flexGrow: 1,
            paddingBottom: keyboardVisible ? 280 : 24,
          }}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="interactive"
          showsVerticalScrollIndicator={false}
          automaticallyAdjustKeyboardInsets={Platform.OS === 'ios'}
        >
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
              <H1>Create Account</H1>
              <MutedText>Start your research journey.</MutedText>
            </LogoAndTitle>
            <LoginForm>
              <View style={{ flexDirection: 'row', gap: 10 }}>
                <Input
                  style={{ width: '50%' }}
                  Icon={<User size={16} color={'#7b899d'} />}
                  label="First Name"
                  placeholder="First"
                  keyboardType="default"
                  onChangeText={text => {
                    setFirstName(text);
                    if (errors.firstName) {
                      setErrors(prev => ({ ...prev, firstName: undefined }));
                    }
                  }}
                  value={firstName}
                  error={errors.firstName}
                />
                <Input
                  style={{ width: '50%' }}
                  Icon={<User size={16} color={'#7b899d'} />}
                  label="Last Name "
                  placeholder="Last"
                  keyboardType="default"
                  onChangeText={text => {
                    setLastName(text);
                    if (errors.lastName) {
                      setErrors(prev => ({ ...prev, lastName: undefined }));
                    }
                  }}
                  value={lastName}
                  error={errors.lastName}
                />
              </View>
              <Input
                Icon={<AtSign size={16} color={'#7b899d'} />}
                label="Username"
                placeholder="Username"
                keyboardType="default"
                onChangeText={text => {
                  setUsername(text);
                  if (errors.username) {
                    setErrors(prev => ({ ...prev, username: undefined }));
                  }
                }}
                value={username}
                error={errors.username}
              />

              <Input
                Icon={<Mail size={16} color={'#7b899d'} />}
                label="Email"
                placeholder="you@example.com"
                keyboardType="email-address"
                onFocus={scrollLowerFieldsIntoView}
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
                Icon={<Lock size={16} color={'#7b899d'} />}
                label="Password"
                placeholder="••••••••"
                secureTextEntry={!showPassword}
                onFocus={scrollLowerFieldsIntoView}
                IconRight={
                  <TouchableWithoutFeedback
                    onPress={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? (
                      <EyeOff size={16} color={'#7b899d'} />
                    ) : (
                      <Eye size={16} color={'#7b899d'} />
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
              <Input
                Icon={<Lock size={16} color={'#7b899d'} />}
                label="Confirm Password"
                placeholder="••••••••"
                secureTextEntry={!showPassword}
                onFocus={scrollLowerFieldsIntoView}
                IconRight={
                  <TouchableWithoutFeedback
                    onPress={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? (
                      <EyeOff size={16} color={'#7b899d'} />
                    ) : (
                      <Eye size={16} color={'#7b899d'} />
                    )}
                  </TouchableWithoutFeedback>
                }
                onChangeText={text => {
                  setConfirmPassword(text);
                  if (errors.confirmPassword) {
                    setErrors(prev => ({
                      ...prev,
                      confirmPassword: undefined,
                    }));
                  }
                }}
                value={confirmPassword}
                error={errors.confirmPassword}
              />
              <View>
                <Button onPress={handleSignUp} disabled={isLoading}>
                  {isLoading ? 'Signing Up...' : 'Sign Up'}
                </Button>
              </View>
              <View
                style={{
                  flexDirection: 'row',
                  justifyContent: 'center',
                  alignItems: 'baseline',
                }}
              >
                <MutedText>Already have an account?</MutedText>
                <Button variant="tertiary" onPress={handleSignIn}>
                  Sign in
                </Button>
              </View>
            </LoginForm>
          </Screen>
          </TouchableWithoutFeedback>
        </ScrollView>
      </KeyboardAvoidingView>
    </LoginScreen>
  );
};

export default Login;
