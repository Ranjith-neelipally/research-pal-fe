import type { IdeaDto } from "@/services/ideas";
import type { IdeaEntity } from "@/store/ideas/types";

export function mapIdea(dto: IdeaDto): IdeaEntity {
  const createdAt = dto.createdAt || dto.date || new Date().toISOString();
  return {
    id: dto._id,
    content: dto.idea,
    date: dto.date || createdAt,
    createdAt,
    updatedAt: dto.updatedAt,
  };
}
