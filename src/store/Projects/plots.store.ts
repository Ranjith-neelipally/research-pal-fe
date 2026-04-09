import { create } from 'zustand';

interface PlotInterface {
  projectId: string;
  title: string;
  userId: string;
  replication: number;
  treatment: number;
  plotIndex: [number, number];
  notesCount?: number;
  _id?: string;
  createdAt?: string;
  updatedAt?: string;
  __v?: number;
}

interface Plots {
  plot: PlotInterface[];
  setPlot: (plots: PlotInterface[]) => void;
}

export const usePlotsStore = create<Plots>(set => ({
  plot: [],
  setPlot: (plots: PlotInterface[]) => set({ plot: plots }),
}));
