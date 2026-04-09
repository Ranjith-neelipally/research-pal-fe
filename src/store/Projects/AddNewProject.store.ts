import { create } from 'zustand';
import { useAuthStore } from '../auth.store';

interface AddNewProjectState {
  title: string;
  location?: string;
  replications: number;
  treatments: number;
  userId: string;
  errorStatus?: string | undefined;
}

export interface AddNewProjectAction {
  setTitle: (title: string) => void;
  setLocation: (location: string) => void;
  setReplications: (replications: number) => void;
  setTreatments: (treatments: number) => void;
  setUserId: (userId: string) => void;
  getProjectData: () => Partial<AddNewProjectState>;
  setErrorStatus: (status: string) => void;
}

export const useAddNewProjectStore = create<
  AddNewProjectState & AddNewProjectAction
>((set, get) => ({
  title: '',
  location: undefined,
  replications: 0,
  treatments: 0,
  userId: '',
  errorStatus: undefined,

  setTitle: title => set({ title }),
  setLocation: location => set({ location }),
  setReplications: replications => set({ replications }),
  setTreatments: treatments => set({ treatments }),
  setUserId: userId => set({ userId }),
  setErrorStatus: status => set({ errorStatus: status }),
  getProjectData: () => {
    const state = get();
    return {
      title: state.title,
      location: state.location,
      replications: state.replications,
      treatments: state.treatments,
      userId: state.userId,
    };
  },
}));
