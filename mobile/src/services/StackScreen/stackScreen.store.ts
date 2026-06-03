import { create } from 'zustand';

interface ActionButtons {
  title: string;
  onPress: () => void;
  icon?: string;
  varient?: 'primary' | 'secondary' | 'tertiary';
}

interface HeaderConfig {
  projectIndex?: number | null;
  numberOfSteps?: number | null;
  screenTitle?: string | null;
  headerSubtitle?: string | null;
  headerIcon?: string | null;
  headerSubIcon?: string | null;
  showProgressBar?: boolean;
  showActionsMenu?: boolean;
  actionButtons?: ActionButtons[];
}

interface StackHeaderStore {
  header: HeaderConfig;
  setHeader: (config: Partial<HeaderConfig>) => void;
  resetHeader: () => void;
}

const initialHeader: HeaderConfig = {
  projectIndex: null,
  numberOfSteps: null,
  screenTitle: null,
  headerSubtitle: null,
  headerIcon: null,
  headerSubIcon: null,
  showProgressBar: false,
  showActionsMenu: false,
  actionButtons: [],
};

export const useStackScreenStore = create<StackHeaderStore>(set => ({
  header: initialHeader,

  setHeader: config =>
    set(state => ({
      header: { ...state.header, ...config },
    })),

  resetHeader: () => set({ header: initialHeader }),
}));
