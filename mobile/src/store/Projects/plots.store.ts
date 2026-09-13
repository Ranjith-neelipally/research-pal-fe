import { create } from 'zustand';

interface PlotInterface {
  projectId: string;
  title: string;
  userId: string;
  replication: number;
  treatment: number;
  plotIndex: [number, number];
  replicationName?: string;
  treatmentName?: string;
  notesCount?: number;
  _id?: string;
  createdAt?: string;
  updatedAt?: string;
  __v?: number;
  serverVersion?: number;
  lastModifiedByDeviceId?: string;
  syncedAt?: string | null;
  createdOfflineAt?: string | null;
  syncStatus?: 'synced' | 'pending' | 'conflict' | 'local_only';
}

interface Plots {
  plot: PlotInterface[];
  setPlot: (plots: PlotInterface[]) => void;
}

export const usePlotsStore = create<Plots>(set => ({
  plot: [],
  setPlot: (plots: PlotInterface[]) => set({ plot: plots }),
}));
