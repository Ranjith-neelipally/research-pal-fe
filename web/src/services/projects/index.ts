import { api } from "@/services/api";

export interface ProjectDto {
  _id: string;
  title: string;
  location?: string;
  replicationsCount?: number;
  treatmentsCount?: number;
  plotsCount?: number;
  notesCount?: number;
  plotColors?: string[];
  userId?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface PlotPayload {
  title: string;
  color: string;
  notesCount: number;
  replication: number;
  treatment: number;
  plotIndex: number[];
}

export interface PlotDto {
  _id: string;
  title: string;
  color: string;
  notesCount?: number;
  replication: number;
  treatment: number;
  plotIndex?: number[];
  projectId: string;
}

export interface PlotNoteDto {
  _id: string;
  projectId: string;
  plotId: string;
  title?: string;
  content?: Array<{ note?: string[]; photoIds?: string[] }>;
  createdAt?: string;
  updatedAt?: string;
  date?: string;
}

const unwrap = <T>(payload: unknown): T => {
  if (payload && typeof payload === "object" && "data" in payload) {
    return (payload as { data: T }).data;
  }
  return payload as T;
};

export async function getProjectsService() {
  const response = await api.get("/projects");
  const data = unwrap<ProjectDto[] | { data?: ProjectDto[] }>(response.data);
  return Array.isArray(data) ? data : data.data || [];
}

export async function createProjectService(payload: {
  title: string;
  location: string;
  replications: number;
  treatments: number;
  plotsCount: number;
}) {
  const response = await api.post("/projects", payload);
  return unwrap<ProjectDto>(response.data);
}

export async function createPlotsService(payload: { projectId: string; plots: PlotPayload[] }) {
  const response = await api.post("/projects/plot", payload);
  const data = unwrap<{ plots?: unknown[] }>(response.data);
  return data.plots || [];
}

export async function checkProjectTitleExistsService(title: string) {
  const response = await api.get("/projects/title-exists", { params: { title } });
  return unwrap<{ exists?: boolean }>(response.data);
}

export async function deleteProjectService(projectId: string) {
  await api.delete("/projects", { data: { _id: projectId } });
  return projectId;
}

export async function updateProjectService(payload: {
  _id: string;
  title: string;
  location: string;
  replications: number;
  treatments: number;
}) {
  const response = await api.patch("/projects", payload);
  const data = unwrap<{ newProject?: ProjectDto }>(response.data);
  return data.newProject || (response.data as ProjectDto);
}

export async function renamePlotService(payload: { _id: string; projectId: string; title: string }) {
  const response = await api.patch("/projects/plot", payload);
  const data = unwrap<{ plot?: PlotDto }>(response.data);
  return data.plot || (response.data as PlotDto);
}

export async function getPlotsService(projectId: string) {
  const response = await api.get("/projects/plot", { params: { projectId } });
  const data = response.data as PlotDto[] | { data?: PlotDto[]; dates?: string[] };
  return Array.isArray(data)
    ? { plots: data, dates: [] }
    : { plots: data.data || [], dates: data.dates || [] };
}

export async function getPlotNotesService(params: {
  projectId: string;
  plotId?: string;
  date?: string;
  limit?: number;
  page?: number;
}) {
  const response = await api.get("/projects/note", { params });
  const data = unwrap<PlotNoteDto[] | { data?: PlotNoteDto[]; dates?: string[] }>(response.data);
  return Array.isArray(data) ? data : data.data || [];
}

export async function addPlotNoteService(payload: {
  projectId: string;
  plotId: string;
  content: string[];
  photoIds?: string[];
}) {
  const response = await api.post("/projects/note", payload);
  return unwrap<PlotNoteDto>(response.data);
}

export async function updatePlotNoteService(payload: {
  projectId: string;
  plotId: string;
  noteId: string;
  content: string[];
  photoIds?: string[];
}) {
  const response = await api.patch("/projects/note", payload);
  const data = unwrap<{ updated?: PlotNoteDto } | PlotNoteDto>(response.data);
  return "updated" in data ? data.updated : data;
}

export async function deletePlotNoteService(projectId: string, plotId: string, noteId: string) {
  await api.delete("/projects/note", { data: { _id: noteId, projectId, plotId } });
}
