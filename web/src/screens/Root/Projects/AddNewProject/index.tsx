import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { MapPin, Grid3X3, Layers, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CreatePlotGrid } from "@/components/CreatePlotGrid";
import { useToast } from "@/hooks/use-toast";
import { createProjectWithPlots } from "@/store/projects";
import { useAppDispatch } from "@/store/hooks";
import { checkProjectTitleExistsService } from "@/services/projects";
import { ProjectLocationPicker } from "@/components/ProjectLocationPicker";

interface PlotData {
  id: string;
  customName: string;
  replication: number;
  treatment: number;
}

interface TreatmentColor {
  treatment: number;
  color: string;
}

const CreateProjectPage = () => {
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const { toast } = useToast();
  const [step, setStep] = useState(1);
  const [isSaving, setIsSaving] = useState(false);
  const [isCheckingTitle, setIsCheckingTitle] = useState(false);
  const [titleError, setTitleError] = useState("");
  const [projectData, setProjectData] = useState({
    name: "",
    location: "",
    replications: 3,
    treatments: 4,
  });
  const [plots, setPlots] = useState<PlotData[]>([]);
  const [treatmentColors, setTreatmentColors] = useState<TreatmentColor[]>([]);

  // Generate plots when replications/treatments change
  useEffect(() => {
    const newPlots: PlotData[] = [];
    for (let r = 1; r <= projectData.replications; r++) {
      for (let t = 1; t <= projectData.treatments; t++) {
        const id = `R${r}_T${t}`;
        // Preserve existing plot data if it exists
        const existing = plots.find((p) => p.id === id);
        newPlots.push(
          existing || {
            id,
            customName: "",
            replication: r,
            treatment: t,
          }
        );
      }
    }
    setPlots(newPlots);
  }, [projectData.replications, projectData.treatments]);

  const handleNext = async () => {
    if (step === 1) {
      const title = projectData.name.trim();
      if (!title) return;

      setIsCheckingTitle(true);
      setTitleError("");
      try {
        const result = await checkProjectTitleExistsService(title);
        if (result.exists) {
          const message = "Project title already exists";
          setTitleError(message);
          toast({ title: "Duplicate title", description: message, variant: "destructive" });
          return;
        }
        setStep(2);
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        setTitleError(message);
        toast({
          title: "Title validation failed",
          description: message || "Unable to validate project title. Please try again.",
          variant: "destructive",
        });
      } finally {
        setIsCheckingTitle(false);
      }
      return;
    }

    if (step < 3) {
      setStep(step + 1);
    } else {
      setIsSaving(true);
      try {
        await dispatch(
          createProjectWithPlots({
            title: projectData.name.trim(),
            location: projectData.location.trim(),
            replications: projectData.replications,
            treatments: projectData.treatments,
            plots: plots.map((plot) => ({
              title: plot.customName.trim() || plot.id,
              color:
                treatmentColors.find((item) => item.treatment === plot.treatment)?.color ||
                `hsl(var(--plot-${((plot.treatment - 1) % 6) + 1}))`,
              notesCount: 0,
              replication: plot.replication,
              treatment: plot.treatment,
              plotIndex: [plot.replication, plot.treatment],
            })),
          }),
        ).unwrap();
        toast({ title: "Project created" });
        navigate("/projects");
      } catch (error) {
        toast({
          title: "Project creation failed",
          description: error instanceof Error ? error.message : String(error),
          variant: "destructive",
        });
      } finally {
        setIsSaving(false);
      }
    }
  };

  const handleBack = () => {
    if (step > 1) {
      setStep(step - 1);
    } else {
      navigate("/projects");
    }
  };

  const canProceed = () => {
    switch (step) {
      case 1:
        return projectData.name.trim().length > 0;
      case 2:
        return projectData.location.trim().length > 0;
      case 3:
        return projectData.replications > 0 && projectData.treatments > 0;
      default:
        return false;
    }
  };

  return (
    <div className="mobile-container bg-background min-h-screen">
      <div className="px-4 py-6 space-y-6 safe-bottom">
        <div className="flex items-center justify-between">
          <p className="text-sm font-medium text-muted-foreground">Step {step} of 3</p>
          <button
            onClick={handleBack}
            className="rounded-full bg-secondary px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-secondary/80"
          >
            Back
          </button>
        </div>

        <div className="flex gap-2">
          {[1, 2, 3].map((s) => (
            <div
              key={s}
              className={`h-1 flex-1 rounded-full transition-all duration-300 ${
                s <= step ? "bg-primary" : "bg-secondary"
              }`}
            />
          ))}
        </div>

        <div className="pt-4 animate-fade-in">
          {step === 1 && (
            <div className="space-y-6">
              <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center">
                <Grid3X3 className="text-primary" size={28} />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-foreground mb-2">
                  Project Name
                </h2>
                <p className="text-sm text-muted-foreground mb-4">
                  Give your research project a descriptive name
                </p>
                <input
                  type="text"
                  value={projectData.name}
                  onChange={(e) => {
                    setProjectData({ ...projectData, name: e.target.value });
                    if (titleError) setTitleError("");
                  }}
                  placeholder="e.g., Wheat Drought Tolerance Study"
                  className={`w-full bg-secondary/50 rounded-2xl p-4 text-foreground text-sm focus:outline-none focus:ring-2 placeholder:text-muted-foreground ${
                    titleError ? "ring-2 ring-destructive/60" : "focus:ring-primary/50"
                  }`}
                  autoFocus
                />
                {titleError ? (
                  <p className="mt-2 text-xs font-medium text-destructive">{titleError}</p>
                ) : null}
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-6">
              <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center">
                <MapPin className="text-primary" size={28} />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-foreground mb-2">
                  Location
                </h2>
                <p className="text-sm text-muted-foreground mb-4">
                  Where is this experiment taking place?
                </p>
                <ProjectLocationPicker
                  value={projectData.location}
                  onChange={(location) => setProjectData({ ...projectData, location })}
                />
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-6">
              <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center">
                <Layers className="text-primary" size={28} />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-foreground mb-2">
                  Experiment Design
                </h2>
                <p className="text-sm text-muted-foreground mb-6">
                  Configure your replications and treatments
                </p>

                <div className="space-y-6">
                  <div>
                    <label className="text-sm font-medium text-foreground mb-3 block">
                      Replications
                    </label>
                    <div className="flex flex-wrap gap-2">
                      {[2, 3, 4, 5, 6, 7, 8, 9, 10].map((num) => (
                        <button
                          key={num}
                          onClick={() => setProjectData({ ...projectData, replications: num })}
                          className={`w-10 h-10 rounded-xl text-sm font-semibold transition-all duration-200 ${
                            projectData.replications === num
                              ? "bg-primary text-primary-foreground"
                              : "bg-secondary text-foreground hover:bg-secondary/80"
                          }`}
                        >
                          {num}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="text-sm font-medium text-foreground mb-3 block">
                      Treatments
                    </label>
                    <div className="flex flex-wrap gap-2">
                      {[2, 3, 4, 5, 6, 7, 8, 9, 10].map((num) => (
                        <button
                          key={num}
                          onClick={() => setProjectData({ ...projectData, treatments: num })}
                          className={`w-10 h-10 rounded-xl text-sm font-semibold transition-all duration-200 ${
                            projectData.treatments === num
                              ? "bg-primary text-primary-foreground"
                              : "bg-secondary text-foreground hover:bg-secondary/80"
                          }`}
                        >
                          {num}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="pt-2">
                    <p className="text-sm font-medium text-foreground mb-3">
                      Plot Grid ({projectData.replications * projectData.treatments} plots)
                    </p>
                    <CreatePlotGrid
                      replications={projectData.replications}
                      treatments={projectData.treatments}
                      plots={plots}
                      onPlotsChange={setPlots}
                      treatmentColors={treatmentColors}
                      onTreatmentColorsChange={setTreatmentColors}
                    />
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="fixed bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-background via-background to-transparent">
          <div className="max-w-md mx-auto">
            <Button
              onClick={handleNext}
              disabled={!canProceed() || isSaving || isCheckingTitle}
              className="w-full h-14 rounded-2xl text-base font-semibold gap-2"
            >
              {step === 3 ? (
                <>
                  <Check size={20} />
                  {isSaving ? "Creating..." : "Create Project"}
                </>
              ) : step === 1 && isCheckingTitle ? (
                "Checking..."
              ) : (
                "Continue"
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CreateProjectPage;
