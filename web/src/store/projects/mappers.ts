import type { ProjectDto } from "@/services/projects";
import type { ProjectEntity } from "@/store/projects/types";

export function mapProject(dto: ProjectDto): ProjectEntity {
  return {
    id: dto._id,
    name: dto.title,
    location: dto.location || "",
    replications: dto.replicationsCount || 0,
    treatments: dto.treatmentsCount || 0,
    plotsCount: dto.plotsCount || 0,
    notesCount: dto.notesCount || 0,
    plotColors: dto.plotColors || [],
    createdAt: dto.createdAt || new Date().toISOString(),
    updatedAt: dto.updatedAt,
  };
}
