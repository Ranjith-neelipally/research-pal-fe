import Login from '../../screens/Auth/Login/index';
import SignUp from '../../screens/Auth/SignUp';
import ForgetPassword from '../../screens/Auth/ForgetPassword';
import VerificationScreen from '../../screens/Auth/Verification';

type Screen = {
  name: string;
  component: React.ComponentType;
};

export const Screens: Record<string, Screen> = {
  Login: {
    name: 'Login',
    component: Login,
  },
  SignUp: {
    name: 'SignUp',
    component: SignUp,
  },
  ForgetPassword: {
    name: 'ForgetPassword',
    component: ForgetPassword,
  },
  VerificationScreen: {
    name: 'VerificationScreen',
    component: VerificationScreen,
  },
};
