import styled from 'styled-components/native';
import { H3 } from '../commonStyles/styles';

export const OverlayStyles = styled.View`
  flex: 1;
  justify-content: center;
  align-items: center;
  background-color: rgba(0, 0, 0, 0.4);
`;

export const ModalContent = styled.View`
  padding: 20px;
  border-radius: 10px 10px 0 0;
  width: 100%;
  background-color: #191d24;
  border-color: #191d24;
`;

export const BottomPlacementStyles = styled(ModalContent)`
  bottom: 0;
  position: absolute;
`;

export const CenterPlacementStyles = styled(ModalContent)`
  background-color: red;
  align-items: center;
  width: unset;
`;

export const ModalHeader = styled(H3)`
  font-weight: 600;
`;
