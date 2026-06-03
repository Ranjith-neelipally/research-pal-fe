import {
  View,
  TouchableWithoutFeedback,
  Keyboard,
  Image,
} from 'react-native';
import React, { useState } from 'react';
import { LoginScreen, IconContainer, LogoAndTitle, LoginForm } from './styles';
import { H1, MutedText } from '../../../components/commonStyles/styles';
import { Mail, Lock, EyeOff, Eye } from 'lucide-react-native';
import Input from '../../../components/Input';
import Button from '../../../components/Button';
import { loginService } from '../../../services/login';
import { NavigationProp, useNavigation } from '@react-navigation/native';
import { showApiErrorAlert } from '../../../services/apiError';
const Login = () => {
  const navigation = useNavigation<NavigationProp<any>>();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState<{ email?: string; password?: string }>(
    {},
  );

  const validateForm = () => {
    const newErrors: { email?: string; password?: string } = {};

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

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleLogin = async () => {
    if (!validateForm()) return;
    setIsLoading(true);
    try {
      await loginService(email, password);
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

  return (
    <LoginScreen>
      <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
        <View style={{ width: '85%', flex: 1, justifyContent: 'center' }}>
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
      </TouchableWithoutFeedback>
    </LoginScreen>
  );
};

export default Login;
