import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Loader2, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ProjectLocationPicker } from "@/components/ProjectLocationPicker";
import {
  createPlotsService,
  getPlotsService,
  renamePlotService,
  type PlotDto,
} from "@/services/projects";
import { fetchProjects, selectProjects, selectProjectsStatus, updateProject } from "@/store/projects";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { useToast } from "@/hooks/use-toast";

const EditProjectPage = () => {
  const { id = "" } = useParams();
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const { toast } = useToast();
  const projects = useAppSelector(selectProjects);
  const projectsStatus = useAppSelector(selectProjectsStatus);
  const project = projects.find((item) => item.id === id);
  const [plots, setPlots] = useState<PlotDto[]>([]);
  const [title, setTitle] = useState("");
  const [location, setLocation] = useState("");
  const [replications, setReplications] = useState(1);
  const [treatments, setTreatments] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (projectsStatus === "idle") dispatch(fetchProjects());
  }, [dispatch, projectsStatus]);

  useEffect(() => {
    if (!project) return;
    queueMicrotask(() => {
      setTitle(project.name);
      setLocation(project.location);
      setReplications(project.replications);
      setTreatments(project.treatments);
    });
  }, [project]);

  useEffect(() => {
    if (!id) return;
    getPlotsService(id)
      .then(({ plots: loadedPlots }) => setPlots(loadedPlots))
      .catch((error) =>
        toast({
          title: "Unable to load project structure",
          description: error instanceof Error ? error.message : String(error),
          variant: "destructive",
        }),
      )
      .finally(() => setIsLoading(false));
  }, [id, toast]);

  const minimumReplications = useMemo(
    () => Math.max(1, ...plots.map((plot) => plot.replication)),
    [plots],
  );
  const minimumTreatments = useMemo(
    () => Math.max(1, ...plots.map((plot) => plot.treatment)),
    [plots],
  );

  const structure = useMemo(() => {
    const existing = new Map(plots.map((plot) => [`${plot.replication}-${plot.treatment}`, plot]));
    return Array.from({ length: replications * treatments }, (_, index) => {
      const replication = Math.floor(index / treatments) + 1;
      const treatment = (index % treatments) + 1;
      return existing.get(`${replication}-${treatment}`) || {
        _id: "",
        projectId: id,
        title: `R${replication}_T${treatment}`,
        color: `hsl(var(--plot-${((treatment - 1) % 6) + 1}))`,
        replication,
        treatment,
        notesCount: 0,
        plotIndex: [replication, treatment],
      };
    });
  }, [id, plots, replications, treatments]);

  const updatePlotTitle = (plot: PlotDto, nextTitle: string) => {
    const key = `${plot.replication}-${plot.treatment}`;
    setPlots((current) => {
      const found = current.some((item) => `${item.replication}-${item.treatment}` === key);
      if (found) {
        return current.map((item) =>
          `${item.replication}-${item.treatment}` === key ? { ...item, title: nextTitle } : item,
        );
      }
      return [...current, { ...plot, title: nextTitle }];
    });
  };

  const save = async () => {
    if (!project || !title.trim() || !location.trim() || isSaving) return;
    setIsSaving(true);
    try {
      await dispatch(
        updateProject({
          id: project.id,
          title: title.trim(),
          location: location.trim(),
          replications,
          treatments,
        }),
      ).unwrap();

      const existingPlots = structure.filter((plot) => plot._id);
      const newPlots = structure.filter((plot) => !plot._id);
      await Promise.all(
        existingPlots.map((plot) =>
          renamePlotService({ _id: plot._id, projectId: project.id, title: plot.title.trim() }),
        ),
      );
      if (newPlots.length > 0) {
        await createPlotsService({
          projectId: project.id,
          plots: newPlots.map((plot) => ({
            title: plot.title.trim(),
            color: plot.color,
            notesCount: 0,
            replication: plot.replication,
            treatment: plot.treatment,
            plotIndex: [plot.replication, plot.treatment],
          })),
        });
      }

      toast({ title: "Project updated" });
      navigate(`/projects/${project.id}`, { replace: true });
    } catch (error) {
      toast({
        title: "Project update failed",
        description: error instanceof Error ? error.message : String(error),
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading || !project) {
    return <div className="p-8 text-sm text-muted-foreground">Loading project...</div>;
  }

  return (
    <div className="mx-auto max-w-4xl space-y-8 p-6 md:p-10">
      <div>
        <h2 className="text-xl font-semibold">Edit project</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Structure may be expanded. Existing plots cannot be removed.
        </p>
      </div>

      <section className="grid gap-5 rounded-xl border border-border bg-card p-5">
        <div className="grid gap-2">
          <Label htmlFor="project-title">Title</Label>
          <Input id="project-title" value={title} onChange={(event) => setTitle(event.target.value)} />
        </div>
        <div className="grid gap-2">
          <Label>Location</Label>
          <ProjectLocationPicker value={location} onChange={setLocation} />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="grid gap-2">
            <Label htmlFor="replications">Replications</Label>
            <Input
              id="replications"
              type="number"
              min={minimumReplications}
              max={10}
              value={replications}
              onChange={(event) => setReplications(Math.max(minimumReplications, Number(event.target.value)))}
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="treatments">Treatments</Label>
            <Input
              id="treatments"
              type="number"
              min={minimumTreatments}
              max={10}
              value={treatments}
              onChange={(event) => setTreatments(Math.max(minimumTreatments, Number(event.target.value)))}
            />
          </div>
        </div>
      </section>

      <section>
        <h3 className="mb-3 text-sm font-semibold">Plot names</h3>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {structure.map((plot) => (
            <div key={`${plot.replication}-${plot.treatment}`} className="grid gap-2 rounded-lg border border-border p-3">
              <Label className="text-xs text-muted-foreground">
                R{plot.replication} / T{plot.treatment}
              </Label>
              <Input value={plot.title} onChange={(event) => updatePlotTitle(plot, event.target.value)} />
            </div>
          ))}
        </div>
      </section>

      <div className="flex justify-end gap-2">
        <Button variant="ghost" onClick={() => navigate(`/projects/${project.id}`)}>Cancel</Button>
        <Button onClick={save} disabled={isSaving || !title.trim() || !location.trim()}>
          {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
          Save project
        </Button>
      </div>
    </div>
  );
};

export default EditProjectPage;
