import React from 'react';
import { StyledAddNewButton } from './styles';
import { Plus } from 'lucide-react-native';
import { useAddNewButtonActionsStore } from '../../store/addNew.store';

const AddNew = () => {
  const triggerAddNewButtonAction = useAddNewButtonActionsStore(
    state => state.triggerAddNewButtonAction,
  );

  return (
    <StyledAddNewButton onPress={triggerAddNewButtonAction}>
      <Plus color="#FFFFFF" size={32} />
    </StyledAddNewButton>
  );
};

export default AddNew;
