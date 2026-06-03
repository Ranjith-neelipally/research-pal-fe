export interface PlotNote {
  id: string;
  projectId: string;
  projectName?: string;
  plotId: string;
  plotTitle?: string;
  content: string;
  images: string[];
  createdAt: Date;
  lastUpdated: Date;
}

export interface NotesByDate {
  date: Date;
  notes: PlotNote[];
}
