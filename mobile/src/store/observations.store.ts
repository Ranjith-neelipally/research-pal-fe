import { create } from 'zustand';
import { listObservationTypes } from '../services/Observations';
import type { ObservationType } from '../types/observation';

type ProjectObservationCache = {
  types: ObservationType[];
  isLoading: boolean;
  loaded: boolean;
  error?: string;
  request?: Promise<ObservationType[]>;
};

interface ObservationsState {
  byProjectId: Record<string, ProjectObservationCache | undefined>;
  fetchObservationTypes: (projectId: string, force?: boolean) => Promise<ObservationType[]>;
  setProjectObservationTypes: (projectId: string, types: ObservationType[]) => void;
}

export const useObservationsStore = create<ObservationsState>((set, get) => ({
  byProjectId: {},
  fetchObservationTypes: async (projectId, force = false) => {
    const cached = get().byProjectId[projectId];
    if (!force && cached?.loaded) return cached.types;
    if (!force && cached?.request) return cached.request;

    const request = listObservationTypes(projectId)
      .then(types => {
        set(state => ({
          byProjectId: {
            ...state.byProjectId,
            [projectId]: { types, isLoading: false, loaded: true },
          },
        }));
        return types;
      })
      .catch(error => {
        set(state => ({
          byProjectId: {
            ...state.byProjectId,
            [projectId]: {
              types: cached?.types || [],
              isLoading: false,
              loaded: false,
              error: error?.message || String(error),
            },
          },
        }));
        throw error;
      });

    set(state => ({
      byProjectId: {
        ...state.byProjectId,
        [projectId]: {
          types: cached?.types || [],
          isLoading: true,
          loaded: false,
          request,
        },
      },
    }));

    return request;
  },
  setProjectObservationTypes: (projectId, types) => set(state => ({
    byProjectId: {
      ...state.byProjectId,
      [projectId]: { types, isLoading: false, loaded: true },
    },
  })),
}));
