import { create } from 'zustand';

interface AddNewButtonActionsState {
  isAddNewButtonActionsVisible: boolean;
  setAddNewButtonActionsVisible: (visible: boolean) => void;
  addNewButtonAction: (() => void) | null;
  setAddNewButtonAction: (action: () => void) => void;
  triggerAddNewButtonAction: () => void;
}

export const useAddNewButtonActionsStore = create<AddNewButtonActionsState>(
  (set, get) => ({
    isAddNewButtonActionsVisible: false,
    addNewButtonAction: null,

    setAddNewButtonActionsVisible: (visible: boolean) => {
      set({ isAddNewButtonActionsVisible: visible });
    },

    setAddNewButtonAction: (action: () => void) => {
      set({ addNewButtonAction: action });
    },

    triggerAddNewButtonAction: () => {
      const action = get().addNewButtonAction;
      if (action) action();
    },
  }),
);
