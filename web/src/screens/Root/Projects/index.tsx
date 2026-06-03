import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { FolderKanban } from "lucide-react";
import { ProjectCard } from "@/components/ProjectCard";
import { FloatingAdd } from "@/components/FloatingAdd";
import { EmptyState } from "@/components/EmptyState";
import { fetchProjects, selectProjects, selectProjectsStatus } from "@/store/projects";
import { useAppDispatch, useAppSelector } from "@/store/hooks";

const ProjectsPage = () => {
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const projects = useAppSelector(selectProjects);
  const status = useAppSelector(selectProjectsStatus);

  useEffect(() => {
    if (status === "idle") {
      dispatch(fetchProjects());
    }
  }, [dispatch, status]);

  const handleCreateProject = () => {
    navigate("/projects/new");
  };

  return (
    <div className="mobile-container bg-background">
      <div className="safe-bottom px-4 py-6 space-y-6">
        {/* Projects List */}
        {status === "loading" ? (
          <div className="rounded-3xl border border-border bg-card p-5 text-sm text-muted-foreground">
            Loading projects...
          </div>
        ) : projects.length === 0 ? (
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
