export interface ProjectEntity {
  id: string;
  name: string;
  location: string;
  replications: number;
  treatments: number;
  plotsCount: number;
  notesCount: number;
  plotColors: string[];
  createdAt: string;
  updatedAt?: string;
}

export interface ProjectsState {
  items: ProjectEntity[];
  status: "idle" | "loading" | "succeeded" | "failed";
  error: string | null;
}
