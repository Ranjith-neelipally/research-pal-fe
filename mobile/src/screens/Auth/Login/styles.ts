import styled from 'styled-components/native';
import { Screen } from '../../../components/commonStyles/styles';

export const LoginScreen = styled(Screen)`
  flex: 1;
  justify-content: center;
  align-items: center;
`;

export const IconContainer = styled.View`
  background-color: #30a65b1a;
  border-radius: 20px;
  padding: 20px;
`;

export const LogoAndTitle = styled.View`
  align-items: center;
  margin-bottom: 40px;

  align-items: center;
  justify-content: center;
`;

export const LoginForm = styled.View`
  width: 100%;
  gap: 16px;

  justify-content: center;
`;
