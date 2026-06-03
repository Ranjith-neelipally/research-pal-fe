import { MapPin, Grid3X3, Calendar } from "lucide-react";
import { format } from "date-fns";

export interface Project {
  id: string;
  name: string;
  location: string;
  replications: number;
  treatments: number;
  createdAt: Date | string;
  notesCount: number;
  plotColors?: string[];
}

interface ProjectCardProps {
  project: Project;
  onClick: () => void;
}

export const ProjectCard = ({ project, onClick }: ProjectCardProps) => {
  return (
    <button
      onClick={onClick}
      className="w-full glass-card p-4 text-left transition-all duration-200 active:scale-[0.98]"
    >
      <h3 className="text-base font-semibold text-foreground mb-2">
        {project.name}
      </h3>
      
      <div className="flex items-center gap-2 text-xs text-muted-foreground mb-3">
        <MapPin size={12} />
        <span>{project.location}</span>
      </div>
      
      <div className="flex items-center gap-4 text-xs text-muted-foreground">
        <span className="flex items-center gap-1.5">
          <Grid3X3 size={12} />
          {project.replications}×{project.treatments}
        </span>
        <span className="flex items-center gap-1.5">
          <Calendar size={12} />
          {format(new Date(project.createdAt), "MMM d")}
        </span>
      </div>
      
      {/* Plot preview mini grid */}
      <div className="mt-3 flex gap-1">
        {Array.from({ length: Math.min(project.treatments, 6) }, (_, i) => (
          <div 
            key={i} 
            className={`w-4 h-4 rounded-sm bg-plot-${(i % 6) + 1}/30`}
            style={{
              backgroundColor: project.plotColors?.[i] || `hsl(var(--plot-${(i % 6) + 1}) / 0.3)`,
            }}
          />
        ))}
        {project.treatments > 6 && (
          <span className="text-xs text-muted-foreground ml-1">
            +{project.treatments - 6}
          </span>
        )}
      </div>
    </button>
  );
};
