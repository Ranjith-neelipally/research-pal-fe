import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { Trash2, Edit2, FileText, Calendar } from "lucide-react";
import { format, parseISO } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import type { PlotNote } from "@/types/plotNote";
import {
  deletePlotNoteService,
  getPlotNotesService,
  getPlotsService,
  type PlotNoteDto,
} from "@/services/projects";

const mapPlotNote = (note: PlotNoteDto): PlotNote => {
  const createdAt = new Date(note.createdAt || Date.now());
  return {
    id: note._id,
    projectId: note.projectId,
    plotId: note.plotId,
    plotTitle: note.title,
    content: note.content?.[0]?.note?.join("\n") || "",
    images: [],
    createdAt,
    lastUpdated: new Date(note.updatedAt || note.createdAt || Date.now()),
  };
};

const ProjectNotesListPage = () => {
  const navigate = useNavigate();
  const { projectId } = useParams();
  const [searchParams] = useSearchParams();
  const { toast } = useToast();
  const dateParam = searchParams.get("date");
  const selectedDate = dateParam ? parseISO(dateParam) : new Date();
  const [plotNotes, setPlotNotes] = useState<PlotNote[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!projectId) return;

    setIsLoading(true);
    Promise.all([
      getPlotNotesService({ projectId, date: format(selectedDate, "yyyy-MM-dd"), limit: 100 }),
      getPlotsService(projectId),
    ])
      .then(([notes, plotData]) => {
        const plotTitles = new Map(plotData.plots.map((plot) => [plot._id, plot.title]));
        setPlotNotes(
          notes.map((note) => ({
            ...mapPlotNote(note),
            plotTitle: plotTitles.get(note.plotId) || note.title,
          })),
        );
      })
      .catch((error) => {
        toast({
          title: "Unable to load notes",
          description: error instanceof Error ? error.message : String(error),
          variant: "destructive",
        });
      })
      .finally(() => setIsLoading(false));
  }, [projectId, selectedDate, toast]);

  const notesForDate = useMemo(() => plotNotes, [plotNotes]);

  const handleEditNote = (note: PlotNote) => {
    navigate(
      `/projects/${note.projectId}/plot/${note.plotId}/note/${note.id}?from=list${
        note.plotTitle ? `&plotTitle=${encodeURIComponent(note.plotTitle)}` : ""
      }`,
    );
  };

  const handleDeleteNote = async (note: PlotNote) => {
    try {
      await deletePlotNoteService(note.projectId, note.plotId, note.id);
      setPlotNotes((prev) => prev.filter((item) => item.id !== note.id));
      toast({ title: "Note deleted" });
    } catch (error) {
      toast({
        title: "Delete failed",
        description: error instanceof Error ? error.message : String(error),
        variant: "destructive",
      });
    }
  };

  const truncateContent = (content: string, maxLength: number = 100) => {
    if (content.length <= maxLength) return content;
    return content.substring(0, maxLength).trim() + "...";
  };

  return (
    <div className="mobile-container bg-background min-h-screen">
      <div className="safe-bottom px-4 py-6 space-y-6">
        <section className="glass-card flex items-center gap-3 p-4">
          <Calendar size={18} className="text-primary" />
          <div>
            <h2 className="text-lg font-bold text-foreground">
              {format(selectedDate, "EEEE, MMM d")}
            </h2>
            <p className="text-sm text-muted-foreground">
              {notesForDate.length} {notesForDate.length === 1 ? "note" : "notes"} across all plots
            </p>
          </div>
        </section>

        <div className="space-y-3">
          {isLoading ? (
            <div className="rounded-3xl border border-border bg-card p-5 text-sm text-muted-foreground">
              Loading notes...
            </div>
          ) : notesForDate.length === 0 ? (
            <div className="text-center py-12">
              <FileText size={48} className="mx-auto text-muted-foreground/50 mb-4" />
              <p className="text-muted-foreground font-medium">No notes for this date</p>
              <p className="text-sm text-muted-foreground mt-1">Select another date from the calendar</p>
            </div>
          ) : (
            notesForDate.map((note, idx) => (
              <div
                key={note.id}
                className="glass-card p-4 space-y-3 stagger-item"
                style={{ animationDelay: `${idx * 50}ms` }}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-10 h-10 rounded-xl bg-primary/20 border border-primary/40 flex items-center justify-center flex-shrink-0">
                      <span className="text-[10px] font-bold text-primary truncate px-1">
                        {note.plotTitle || note.plotId}
                      </span>
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">
                        {note.projectName || "Project note"}
                      </p>
                      <span className="flex items-center gap-1 text-xs text-muted-foreground mt-0.5">
                        <FileText size={10} />
                        Text
                      </span>
                    </div>
                  </div>
                  <span className="text-xs text-muted-foreground flex-shrink-0">
                    {format(note.lastUpdated, "h:mm a")}
                  </span>
                </div>

                <p className="text-sm text-muted-foreground line-clamp-2">
                  {truncateContent(note.content)}
                </p>

                {/* Photos are disabled in the web version for now. */}

                <div className="flex items-center gap-2 pt-2 border-t border-border">
                  <button
                    onClick={() => handleEditNote(note)}
                    className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-secondary hover:bg-secondary/80 transition-colors text-sm font-medium"
                  >
                    <Edit2 size={14} />
                    Edit Note
                  </button>
                  <button
                    onClick={() => handleDeleteNote(note)}
                    className="flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-destructive/10 hover:bg-destructive/20 text-destructive transition-colors text-sm font-medium"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

export default ProjectNotesListPage;
