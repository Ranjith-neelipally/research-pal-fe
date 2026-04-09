import styled from 'styled-components/native';

export const Screen = styled.View`
  flex: 1;
  background-color: #101318;
  padding: 24px 16px;
  gap: 24px;
`;

export const H1 = styled.Text`
  font-size: 24px;
  font-weight: 700;
  color: #e7ebef;
  line-height: 32px;
  margin-bottom: 4px;
`;

export const SmallH1 = styled(H1)`
  font-size: 20px;
  line-height: 28px;
`;

export const H2 = styled(H1)`
  font-weight: 600;
`;

export const H3 = styled(H1)`
  font-size: 18px;
  line-height: 28px;
`;

export const SmallH3 = styled(H3)`
  font-size: 14px;
  font-weight: 500;
`;

export const MutedText = styled.Text`
  font-size: 14px;
  color: #7b899d;
  line-height: 20px;
`;

export const SmallMutedText = styled(MutedText)`
  font-size: 12px;
`;

export const TextSecondary = styled.Text`
  font-size: 14px;
  color: #e7ebef;
  font-weight: 400;
  line-height: 20px;
`;

export const HeaderSecondary = styled(H3)`
  font-weight: 600;
  color: #7b899d;
`;

export const TextPrimary = styled.Text`
  font-size: 16px;
  color: #101318;
  font-weight: 500;
  line-height: 24px;
`;
