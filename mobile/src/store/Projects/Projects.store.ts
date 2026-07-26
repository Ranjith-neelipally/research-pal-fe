import { create } from 'zustand';

export interface Project {
  _id: string;
  title: string;
  location: string;
  replicationsCount: number;
  treatmentsCount: number;
  userId: string;
  plotsCount: number;
  createdAt: string;
  updatedAt: string;
  plotColors: string[];
  notesCount: number;
  serverVersion?: number;
  lastModifiedByDeviceId?: string;
  syncedAt?: string | null;
  createdOfflineAt?: string | null;
  syncStatus?: 'synced' | 'pending' | 'conflict' | 'local_only';
}

export interface ProjectAction {
  isProjectAdding: boolean;
}

export interface ProjectsState {
  projectsData: Project[];
  setProjectsData: (projects: Project[]) => void;
  updateProject: (project: Project) => void;
  removeProject: (projectId: string) => void;
}

export interface ProjectsActionState {
  isProjectAdding: boolean;
  setIsProjectAdding: (isAdding: boolean) => void;
}

export const useProjectsStore = create<ProjectsState>(set => ({
  projectsData: [],
  setProjectsData: projects => set({ projectsData: projects }),
  updateProject: updatedProject =>
    set(state => ({
      projectsData: state.projectsData.map(project =>
        project._id === updatedProject._id
          ? { ...project, ...updatedProject }
          : project,
      ),
    })),
  removeProject: projectId =>
    set(state => ({
      projectsData: state.projectsData.filter(
        project => project._id !== projectId,
      ),
    })),
}));

export const useProjectsActionStore = create<ProjectsActionState>(set => ({
  isProjectAdding: false,
  setIsProjectAdding: isAdding => set({ isProjectAdding: isAdding }),
}));
