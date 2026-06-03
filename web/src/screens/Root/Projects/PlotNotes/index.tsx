import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { Plus, Calendar, FileText, Trash2, Edit2 } from "lucide-react";
import { format, startOfDay, isSameDay } from "date-fns";
import type { PlotNote, NotesByDate } from "@/types/plotNote";
import { useToast } from "@/hooks/use-toast";
import { deletePlotNoteService, getPlotNotesService, type PlotNoteDto } from "@/services/projects";

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

const PlotNotesPage = () => {
  const navigate = useNavigate();
  const { projectId, plotId } = useParams();
  const [searchParams] = useSearchParams();
  const { toast } = useToast();
  const [plotNotes, setPlotNotes] = useState<PlotNote[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!projectId || !plotId) return;

    setIsLoading(true);
    getPlotNotesService({ projectId, plotId, limit: 100 })
      .then((notes) => setPlotNotes(notes.map(mapPlotNote)))
      .catch((error) => {
        toast({
          title: "Unable to load notes",
          description: error instanceof Error ? error.message : String(error),
          variant: "destructive",
        });
      })
      .finally(() => setIsLoading(false));
  }, [projectId, plotId, toast]);

  const notesByDate = useMemo<NotesByDate[]>(() => {
    const grouped = new Map<number, PlotNote[]>();

    plotNotes.forEach((note) => {
      const dayStart = startOfDay(note.createdAt).getTime();
      const existing = grouped.get(dayStart) || [];
      grouped.set(dayStart, [...existing, note]);
    });

    return Array.from(grouped.entries())
      .sort(([a], [b]) => b - a)
      .map(([timestamp, notes]) => ({
        date: new Date(timestamp),
        notes: notes.sort((a, b) => b.lastUpdated.getTime() - a.lastUpdated.getTime()),
      }));
  }, [plotNotes]);

  const handleAddNote = () => {
    const plotTitleQuery = searchParams.get("plotTitle");
    navigate(
      `/projects/${projectId}/plot/${plotId}/note/new${
        plotTitleQuery ? `?plotTitle=${encodeURIComponent(plotTitleQuery)}` : ""
      }`,
    );
  };

  const handleEditNote = (noteId: string) => {
    const plotTitleQuery = searchParams.get("plotTitle");
    navigate(
      `/projects/${projectId}/plot/${plotId}/note/${noteId}?from=plot${
        plotTitleQuery ? `&plotTitle=${encodeURIComponent(plotTitleQuery)}` : ""
      }`,
    );
  };

  const handleDeleteNote = async (noteId: string) => {
    if (!projectId || !plotId) return;

    try {
      await deletePlotNoteService(projectId, plotId, noteId);
      setPlotNotes((prev) => prev.filter((note) => note.id !== noteId));
      toast({ title: "Note deleted" });
    } catch (error) {
      toast({
        title: "Delete failed",
        description: error instanceof Error ? error.message : String(error),
        variant: "destructive",
      });
    }
  };

  const formatDateHeader = (date: Date) => {
    const today = startOfDay(new Date());
    const noteDate = startOfDay(date);

    if (isSameDay(today, noteDate)) return "Today";
    if (isSameDay(new Date(today.getTime() - 86400000), noteDate)) return "Yesterday";
    return format(date, "EEEE, MMM d");
  };

  const truncateContent = (content: string, maxLength: number = 120) => {
    if (content.length <= maxLength) return content;
    return content.substring(0, maxLength).trim() + "...";
  };

  const plotTitle = searchParams.get("plotTitle") || plotNotes[0]?.plotTitle || plotId;

  return (
    <div className="mobile-container bg-background min-h-screen">
      <div className="safe-bottom px-4 py-6 space-y-6">
        <section className="glass-card flex items-center justify-between gap-3 p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary/20 border border-primary/40 flex items-center justify-center">
              <span className="text-[10px] font-bold text-primary truncate px-1">{plotTitle}</span>
            </div>
            <div>
              <h2 className="text-lg font-bold text-foreground">Plot {plotTitle}</h2>
              <p className="text-xs text-muted-foreground">
                {plotNotes.length} {plotNotes.length === 1 ? "note" : "notes"}
              </p>
            </div>
          </div>
          <button
            onClick={handleAddNote}
            className="flex items-center gap-1.5 px-4 py-2 rounded-full bg-primary text-primary-foreground text-sm font-medium"
          >
            <Plus size={16} />
            Add Note
          </button>
        </section>

        {isLoading ? (
          <div className="rounded-3xl border border-border bg-card p-5 text-sm text-muted-foreground">
            Loading notes...
          </div>
        ) : notesByDate.length === 0 ? (
          <div className="text-center py-12">
            <FileText size={48} className="mx-auto text-muted-foreground/50 mb-4" />
            <p className="text-muted-foreground font-medium">No notes for this plot</p>
            <p className="text-sm text-muted-foreground mt-1">Tap "Add Note" to create your first observation</p>
          </div>
        ) : (
          notesByDate.map((group, groupIdx) => (
            <section key={group.date.getTime()} className="space-y-3">
              <div className="flex items-center gap-2 sticky top-0 bg-background py-2 z-10">
                <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-secondary/80">
                  <Calendar size={12} className="text-primary" />
                  <span className="text-xs font-medium text-foreground">{formatDateHeader(group.date)}</span>
                  <span className="text-xs text-muted-foreground">
                    · {group.notes.length} {group.notes.length === 1 ? "note" : "notes"}
                  </span>
                </div>
              </div>

              {group.notes.map((note, idx) => (
                <div
                  key={note.id}
                  className="glass-card p-4 space-y-3 stagger-item"
                  style={{ animationDelay: `${(groupIdx * 3 + idx) * 50}ms` }}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <FileText size={14} className="text-muted-foreground" />
                      <span className="text-xs text-muted-foreground">
                        {format(note.lastUpdated, "h:mm a")}
                      </span>
                    </div>
                  </div>

                  <button
                    onClick={() => handleEditNote(note.id)}
                    className="w-full cursor-pointer rounded-lg p-2 -mx-2 text-left transition-colors hover:bg-secondary/30"
                  >
                    <p className="text-sm text-foreground leading-relaxed whitespace-pre-wrap line-clamp-4">
                      {truncateContent(note.content)}
                    </p>
                  </button>

                  {/* Photos are disabled in the web version for now. */}

                  <div className="flex items-center gap-2 pt-2 border-t border-border">
                    <button
                      onClick={() => handleEditNote(note.id)}
                      className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-secondary hover:bg-secondary/80 transition-colors text-sm font-medium"
                    >
                      <Edit2 size={14} />
                      Edit Note
                    </button>
                    <button
                      onClick={() => handleDeleteNote(note.id)}
                      className="flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-destructive/10 hover:bg-destructive/20 text-destructive transition-colors text-sm font-medium"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              ))}
            </section>
          ))
        )}
      </div>
    </div>
  );
};

export default PlotNotesPage;
