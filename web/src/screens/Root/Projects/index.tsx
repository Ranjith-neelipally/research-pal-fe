import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { FolderKanban } from "lucide-react";
import { ProjectCard } from "@/components/ProjectCard";
import type { Project } from "@/components/ProjectCard";
import { FloatingAdd } from "@/components/FloatingAdd";
import { EmptyState } from "@/components/EmptyState";

// Mock data
const mockProjects: Project[] = [
  {
    id: "1",
    name: "Wheat Drought Tolerance Study",
    location: "Field Station A, Block 3",
    replications: 4,
    treatments: 5,
    createdAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
    notesCount: 23,
  },
  {
    id: "2",
    name: "Tomato Variety Trial 2024",
    location: "Greenhouse Complex B",
    replications: 3,
    treatments: 8,
    createdAt: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000),
    notesCount: 45,
  },
  {
    id: "3",
    name: "Soil Amendment Effect Study",
    location: "North Research Plot",
    replications: 5,
    treatments: 4,
    createdAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
    notesCount: 12,
  },
];

const ProjectsPage = () => {
  const navigate = useNavigate();
  const [projects] = useState<Project[]>(mockProjects);

  const handleCreateProject = () => {
    navigate("/projects/new");
  };

  return (
    <div className="mobile-container bg-background">
      <div className="safe-bottom px-4 py-6 space-y-6">
        {/* Projects List */}
        {projects.length === 0 ? (
          <EmptyState
            icon={FolderKanban}
            title="No projects yet"
            description="Create your first research project to start organizing your field experiments and observations."
            action={{
              label: "Create Project",
              onClick: handleCreateProject,
            }}
          />
        ) : (
          <div className="space-y-3">
            {projects.map((project, idx) => (
              <div
                key={project.id}
                className="stagger-item"
                style={{ animationDelay: `${idx * 50}ms` }}
              >
                <ProjectCard
                  project={project}
                  onClick={() => navigate(`/projects/${project.id}`)}
                />
              </div>
            ))}
          </div>
        )}
      </div>

      {/* FAB for creating new project */}
      <FloatingAdd onClick={handleCreateProject} label="Create project" />
    </div>
  );
};

export default ProjectsPage;
