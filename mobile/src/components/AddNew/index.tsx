import React from 'react';
import { StyledAddNewButton } from './styles';
import { Plus } from 'lucide-react-native';
import { useAddNewButtonActionsStore } from '../../store/addNew.store';

interface AddNewProps {
  inline?: boolean;
  floating?: boolean;
  bottomOffset?: number;
  onPress?: () => void;
}

const AddNew = ({ inline = false, floating = false, bottomOffset, onPress }: AddNewProps) => {
  const triggerAddNewButtonAction = useAddNewButtonActionsStore(
    state => state.triggerAddNewButtonAction,
  );

  return (
    <StyledAddNewButton
      $inline={inline}
      $floating={floating}
      $bottomOffset={bottomOffset}
      onPress={onPress || triggerAddNewButtonAction}
      accessibilityRole="button"
      accessibilityLabel="Add new"
    >
      <Plus color="#FFFFFF" size={32} />
    </StyledAddNewButton>
  );
};

export default AddNew;
