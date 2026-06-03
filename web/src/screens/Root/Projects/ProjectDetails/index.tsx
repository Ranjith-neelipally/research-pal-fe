import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Calendar, MapPin } from "lucide-react";
import { PlotGrid } from "@/components/PlotGrid";
import { CalendarModal } from "@/components/CalendarModal";
import { format } from "date-fns";
import { fetchProjects, selectProjects, selectProjectsStatus } from "@/store/projects";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { getPlotsService, type PlotDto } from "@/services/projects";
import { useToast } from "@/hooks/use-toast";

const ProjectDetailPage = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const dispatch = useAppDispatch();
  const { toast } = useToast();
  const projects = useAppSelector(selectProjects);
  const projectsStatus = useAppSelector(selectProjectsStatus);
  const project = projects.find((item) => item.id === id);
  const [plots, setPlots] = useState<PlotDto[]>([]);
  const [datesWithNotes, setDatesWithNotes] = useState<Date[]>([]);
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);

  useEffect(() => {
    if (projectsStatus === "idle") {
      dispatch(fetchProjects());
    }
  }, [dispatch, projectsStatus]);

  useEffect(() => {
    if (!id) return;
    getPlotsService(id)
      .then((data) => {
        setPlots(data.plots);
        setDatesWithNotes(data.dates.map((date) => new Date(`${date}T00:00:00`)));
      })
      .catch((error) => {
        toast({
          title: "Unable to load plots",
          description: error instanceof Error ? error.message : String(error),
          variant: "destructive",
        });
      });
  }, [id, toast]);

  const gridPlots = useMemo(
    () =>
      plots.map((plot) => ({
        id: plot._id,
        title: plot.title,
        color: plot.color,
        replication: plot.replication,
        treatment: plot.treatment,
      })),
    [plots],
  );

  const handleDateSelect = (date: Date) => {
    // Navigate to the notes list page for this date
    const dateStr = format(date, "yyyy-MM-dd");
    navigate(`/projects/${id}/notes?date=${dateStr}`);
  };

  return (
    <div className="mobile-container bg-background min-h-screen">
      <div className="safe-bottom px-4 py-6 space-y-6">
        <section className="glass-card p-4">
          <h2 className="text-lg font-bold text-foreground">{project?.name || "Project"}</h2>
          <div className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
            <MapPin size={10} />
            <span>{project?.location || "No location"}</span>
          </div>
        </section>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-3 stagger-item" style={{ animationDelay: "50ms" }}>
          <div className="glass-card p-3 text-center">
            <p className="text-2xl font-bold text-foreground">
              {project ? project.replications * project.treatments : plots.length}
            </p>
            <p className="text-xs text-muted-foreground mt-1">Plots</p>
          </div>
          <div className="glass-card p-3 text-center">
            <p className="text-2xl font-bold text-foreground">
              {plots.reduce((total, plot) => total + (plot.notesCount || 0), 0)}
            </p>
            <p className="text-xs text-muted-foreground mt-1">Notes</p>
          </div>
          <button
            onClick={() => setIsCalendarOpen(true)}
            className="glass-card p-3 text-center hover:bg-secondary/50 active:scale-95 transition-all group relative"
          >
            <div className="flex items-center justify-center">
              <Calendar size={24} className="text-primary group-hover:scale-110 transition-transform" />
            </div>
            <p className="text-xs text-muted-foreground mt-1">View Notes</p>
            <span className="absolute -top-1 -right-1 w-2 h-2 bg-primary rounded-full animate-pulse" />
          </button>
        </div>

        {/* Plot Grid */}
        <section className="stagger-item" style={{ animationDelay: "200ms" }}>
          <h2 className="text-base font-semibold text-foreground mb-4">
            Plot Layout
          </h2>
          <div className="glass-card p-4">
            <PlotGrid
              projectId={id || ""}
              replications={project?.replications || 0}
              treatments={project?.treatments || 0}
              plots={gridPlots}
            />
          </div>
        </section>

        {/* Instructions */}
        <div className="text-center py-4">
          <p className="text-xs text-muted-foreground">
            Tap any plot to view or add notes
          </p>
        </div>
      </div>

      {/* Calendar Modal */}
      <CalendarModal
        isOpen={isCalendarOpen}
        onClose={() => setIsCalendarOpen(false)}
        onSelectDate={handleDateSelect}
        datesWithNotes={datesWithNotes}
      />
    </div>
  );
};

export default ProjectDetailPage;
