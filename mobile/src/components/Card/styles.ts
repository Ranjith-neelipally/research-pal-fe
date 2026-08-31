import styled from 'styled-components/native';
import LinearGradient from 'react-native-linear-gradient';

export const cardGradientColors = ['#1d2330', '#14181f'];
export const cardGradientStart = { x: 0, y: 0 };
export const cardGradientEnd = { x: 1, y: 1 };

export const CardContainer = styled(LinearGradient)`

  border-radius: 12px;
`;

export const Card = styled.View`
  padding: 20px;
  border-radius: 12px;
  background-color: #1d2330;
`;
