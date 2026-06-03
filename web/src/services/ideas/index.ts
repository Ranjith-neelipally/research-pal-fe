import { api } from "@/services/api";

export interface IdeaDto {
  _id: string;
  idea: string;
  date?: string;
  createdAt?: string;
  updatedAt?: string;
}

const unwrap = <T>(payload: unknown): T => {
  if (payload && typeof payload === "object" && "data" in payload) {
    return (payload as { data: T }).data;
  }
  return payload as T;
};

export async function getIdeasService(params: { date?: string; limit?: number; page?: number } = {}) {
  const response = await api.get("/ideas", { params });
  const data = unwrap<{ userIdeas?: IdeaDto[]; page?: number; limit?: number }>(response.data);
  return {
    ideas: data.userIdeas || [],
    page: data.page || params.page || 1,
    limit: data.limit || params.limit || 15,
  };
}

export async function addIdeaService(payload: { date: string; idea: string }) {
  const response = await api.post("/ideas", payload);
  const data = unwrap<{ newNote?: IdeaDto }>(response.data);
  return data.newNote || (response.data as IdeaDto);
}

export async function updateIdeaService(payload: { _id: string; idea: string; date?: string }) {
  const response = await api.patch("/ideas", payload);
  const data = unwrap<{ idea?: IdeaDto }>(response.data);
  return data.idea || (response.data as IdeaDto);
}

export async function deleteIdeaService(_id: string) {
  await api.delete("/ideas", { data: { _id } });
  return _id;
}
