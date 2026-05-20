import {
  View,
  TouchableWithoutFeedback,
  Keyboard,
  KeyboardAvoidingView,
  ScrollView,
  Platform,
} from 'react-native';
import React, { useState } from 'react';
import {
  LoginScreen,
  IconContainer,
  LogoAndTitle,
  LoginForm,
} from '../Login/styles';
import { H1, MutedText, Screen } from '../../../components/commonStyles/styles';
import {
  Leaf,
  Mail,
  Lock,
  EyeOff,
  Eye,
  User,
  AtSign,
} from 'lucide-react-native';
import Input from '../../../components/Input';
import Button from '../../../components/Button';
import { Theme } from '../../../components/theme';
import { SignUp } from '../../../services/login';
import { showApiErrorAlert } from '../../../services/apiError';
import { useNavigation } from '@react-navigation/native';
const Login = () => {
  const navigation = useNavigation();

  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
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

    if (!firstName.trim()) {
      newErrors.firstName = 'First name is required';
    }

    if (!lastName.trim()) {
      newErrors.lastName = 'Last name is required';
    }

    if (!username.trim()) {
      newErrors.username = 'Username is required';
    }

    if (!email) {
      newErrors.email = 'Email is required';
    } else if (!/\S+@\S+\.\S+/.test(email)) {
      newErrors.email = 'Please enter a valid email';
    }

    if (!password) {
      newErrors.password = 'Password is required';
    } else if (password.length < 6) {
      newErrors.password = 'Password must be at least 6 characters';
    }

    if (!confirmPassword) {
      newErrors.confirmPassword = 'Please confirm your password';
    } else if (password !== confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSignUp = async () => {
    if (!validateForm()) return;
    setIsLoading(true);
    try {
      const payload = {
        firstName,
        lastName,
        email,
        password,
        userName: username,
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
                <Leaf size={32} color={Theme.colors.primary} />
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
      </LoginScreen>
    </ScrollView>
  );
};

export default Login;
