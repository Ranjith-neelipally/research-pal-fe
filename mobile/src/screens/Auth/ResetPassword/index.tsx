import React, { useEffect, useState } from 'react';
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
import { NavigationProp, RouteProp, useNavigation, useRoute } from '@react-navigation/native';
import { Eye, EyeOff, Lock } from 'lucide-react-native';
import Button from '../../../components/Button';
import Input from '../../../components/Input';
import { H1, MutedText } from '../../../components/commonStyles/styles';
import { IconContainer, LoginForm, LoginScreen, LogoAndTitle } from '../Login/styles';
import { updateResetPassword, verifyResetPasswordToken } from '../../../services/passwordReset';
import type { RootStackParamList } from '../../../router/MainNavigator';
import { showApiErrorAlert } from '../../../services/apiError';
import { validateBackendPassword } from '../../../utils/authValidation';

type ResetPasswordRoute = RouteProp<RootStackParamList, 'ResetPassword'>;

const ResetPassword = () => {
  const navigation = useNavigation<NavigationProp<any>>();
  const route = useRoute<ResetPasswordRoute>();
  const token = route.params?.token || '';
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isValidating, setIsValidating] = useState(Boolean(token));
  const [isTokenValid, setIsTokenValid] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState<{ password?: string; confirmPassword?: string }>({});

  useEffect(() => {
    let active = true;

    const validateToken = async () => {
      if (!token) {
        setIsValidating(false);
        return;
      }

      try {
        await verifyResetPasswordToken(token);
        if (active) setIsTokenValid(true);
      } catch (error) {
        if (active) showApiErrorAlert('Reset link invalid', error);
      } finally {
        if (active) setIsValidating(false);
      }
    };

    validateToken();

    return () => {
      active = false;
    };
  }, [token]);

  const validateForm = () => {
    const nextErrors: { password?: string; confirmPassword?: string } = {};

    nextErrors.password = validateBackendPassword(password);

    if (!confirmPassword) {
      nextErrors.confirmPassword = 'Please confirm your password.';
    } else if (password.trim() !== confirmPassword.trim()) {
      nextErrors.confirmPassword = 'Passwords do not match.';
    }

    setErrors(nextErrors);
    return Object.values(nextErrors).every(error => !error);
  };

  const handleSubmit = async () => {
    if (!token || !isTokenValid || !validateForm()) return;

    setIsLoading(true);
    try {
      await updateResetPassword(token.trim(), password.trim());
      Alert.alert('Password updated', 'You can now sign in with your new password.', [
        {
          text: 'Back to Login',
          onPress: () =>
            navigation.reset({
              index: 0,
              routes: [{ name: 'Auth', params: { screen: 'Login' } }],
            }),
        },
      ]);
    } catch (error) {
      showApiErrorAlert('Password reset failed', error);
    } finally {
      setIsLoading(false);
    }
  };

  const goToLogin = () => {
    navigation.reset({
      index: 0,
      routes: [{ name: 'Auth', params: { screen: 'Login' } }],
    });
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
            contentContainerStyle={{
              flexGrow: 1,
              justifyContent: 'center',
              paddingBottom: 24,
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
                <H1>Reset Password</H1>
                <MutedText>Enter a new password for your account.</MutedText>
              </LogoAndTitle>
              {!token || (!isValidating && !isTokenValid) ? (
                <LoginForm>
                  <MutedText>
                    This reset link is invalid or expired. Please request a new password reset link.
                  </MutedText>
                  <Button onPress={goToLogin}>Back to Login</Button>
                </LoginForm>
              ) : (
                <LoginForm>
                  <Input
                    Icon={<Lock size={20} color={'#7b899d'} />}
                    label="New Password"
                    placeholder="••••••••"
                    secureTextEntry={!showPassword}
                    editable={!isValidating && !isLoading}
                    IconRight={
                      <TouchableWithoutFeedback onPress={() => setShowPassword(!showPassword)}>
                        {showPassword ? (
                          <EyeOff size={20} color={'#7b899d'} />
                        ) : (
                          <Eye size={20} color={'#7b899d'} />
                        )}
                      </TouchableWithoutFeedback>
                    }
                    onChangeText={text => {
                      setPassword(text);
                      if (errors.password) setErrors(prev => ({ ...prev, password: undefined }));
                    }}
                    value={password}
                    error={errors.password}
                  />
                  <Input
                    Icon={<Lock size={20} color={'#7b899d'} />}
                    label="Confirm Password"
                    placeholder="••••••••"
                    secureTextEntry={!showConfirmPassword}
                    editable={!isValidating && !isLoading}
                    IconRight={
                      <TouchableWithoutFeedback
                        onPress={() => setShowConfirmPassword(!showConfirmPassword)}
                      >
                        {showConfirmPassword ? (
                          <EyeOff size={20} color={'#7b899d'} />
                        ) : (
                          <Eye size={20} color={'#7b899d'} />
                        )}
                      </TouchableWithoutFeedback>
                    }
                    onChangeText={text => {
                      setConfirmPassword(text);
                      if (errors.confirmPassword) {
                        setErrors(prev => ({ ...prev, confirmPassword: undefined }));
                      }
                    }}
                    value={confirmPassword}
                    error={errors.confirmPassword}
                  />
                  <Button onPress={handleSubmit} disabled={isValidating || isLoading}>
                    {isValidating ? 'Checking Link...' : isLoading ? 'Updating...' : 'Update Password'}
                  </Button>
                </LoginForm>
              )}
            </View>
          </ScrollView>
        </TouchableWithoutFeedback>
      </KeyboardAvoidingView>
    </LoginScreen>
  );
};

export default ResetPassword;
