import { useEffect, useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { Save, Trash2, Calendar } from "lucide-react";
import { format } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import {
  addPlotNoteService,
  deletePlotNoteService,
  getPlotNotesService,
  updatePlotNoteService,
  type PlotNoteDto,
} from "@/services/projects";
import { validateRequiredMaxLength } from "@/utils/apiValidation";

const noteText = (note: PlotNoteDto) => note.content?.[0]?.note?.join("\n") || "";
const isObjectId = (value?: string) => /^[a-f\d]{24}$/i.test(value || "");

const EditNotePage = () => {
  const navigate = useNavigate();
  const { projectId, plotId, noteId } = useParams();
  const [searchParams] = useSearchParams();
  const { toast } = useToast();
  const isNewNote = noteId === "new";
  const returnTo = searchParams.get("from") || "plot";
  const plotTitle = searchParams.get("plotTitle") || plotId;
  const [content, setContent] = useState("");
  const [noteDate, setNoteDate] = useState(new Date());
  const [isLoading, setIsLoading] = useState(!isNewNote);
  const [isSaving, setIsSaving] = useState(false);
  const [contentError, setContentError] = useState("");
  const wordCount = content.trim().split(/\s+/).filter(Boolean).length;
  const isOverLimit = wordCount > 5000;

  useEffect(() => {
    if (isNewNote || !projectId || !plotId || !noteId) return;
    if (!isObjectId(plotId)) {
      toast({
        title: "Unable to load note",
        description: "Plot link is invalid. Open notes from the project plot grid.",
        variant: "destructive",
      });
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    getPlotNotesService({ projectId, plotId, limit: 100 })
      .then((notes) => {
        const note = notes.find((item) => item._id === noteId);
        if (!note) {
          toast({ title: "Note not found", variant: "destructive" });
          return;
        }
        setContent(noteText(note));
        setNoteDate(new Date(note.createdAt || Date.now()));
      })
      .catch((error) => {
        toast({
          title: "Unable to load note",
          description: error instanceof Error ? error.message : String(error),
          variant: "destructive",
        });
      })
      .finally(() => setIsLoading(false));
  }, [isNewNote, noteId, plotId, projectId, toast]);

  const handleGoBack = () => {
    if (returnTo === "list") {
      const dateStr = format(noteDate, "yyyy-MM-dd");
      navigate(`/projects/${projectId}/notes?date=${dateStr}`);
    } else {
      navigate(
        `/projects/${projectId}/plot/${plotId}${
          plotTitle ? `?plotTitle=${encodeURIComponent(plotTitle)}` : ""
        }`,
      );
    }
  };

  const handleSave = async () => {
    if (!projectId || !plotId || !noteId || !isObjectId(plotId)) return;
    const validationError = validateRequiredMaxLength(content, 2000, "Note content");
    if (validationError) { setContentError(validationError); return; }
    if (isOverLimit) {
      setContentError("Note content is too long.");
      return;
    }

    setIsSaving(true);
    try {
      const lines = content.split("\n").map((line) => line.trim()).filter(Boolean);
      if (isNewNote) {
        await addPlotNoteService({ projectId, plotId, content: lines });
        toast({ title: "Note created" });
      } else {
        await updatePlotNoteService({ projectId, plotId, noteId, content: lines });
        toast({ title: "Note updated" });
      }
      handleGoBack();
    } catch (error) {
      toast({
        title: isNewNote ? "Create failed" : "Update failed",
        description: error instanceof Error ? error.message : String(error),
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!projectId || !plotId || !noteId || isNewNote || !isObjectId(plotId)) return;

    try {
      await deletePlotNoteService(projectId, plotId, noteId);
      toast({ title: "Note deleted" });
      handleGoBack();
    } catch (error) {
      toast({
        title: "Delete failed",
        description: error instanceof Error ? error.message : String(error),
        variant: "destructive",
      });
    }
  };

  return (
    <div className="mobile-container bg-background min-h-screen">
      <div className="safe-bottom px-4 py-6 space-y-6">
        <section className="glass-card flex flex-wrap items-center justify-between gap-3 p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary/20 border border-primary/40 flex items-center justify-center">
              <span className="text-[10px] font-bold text-primary truncate px-1">{plotTitle}</span>
            </div>
            <div>
              <h2 className="text-lg font-bold text-foreground">
                {isNewNote ? "New Note" : "Edit Note"}
              </h2>
              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                <Calendar size={10} />
                <span>{format(noteDate, "MMM d, yyyy")}</span>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {!isNewNote && (
              <button
                onClick={handleDelete}
                className="p-2 rounded-full hover:bg-destructive/10 transition-colors"
              >
                <Trash2 size={20} className="text-destructive" />
              </button>
            )}
            <button
              onClick={handleSave}
              disabled={isSaving || isLoading || isOverLimit || !content.trim()}
              className="flex items-center gap-1.5 px-4 py-2 rounded-full bg-primary text-primary-foreground text-sm font-medium disabled:opacity-50"
            >
              <Save size={16} />
              {isSaving ? "Saving..." : "Save"}
            </button>
          </div>
        </section>

        <section className="glass-card p-4 space-y-4">
          {isLoading ? (
            <div className="text-sm text-muted-foreground">Loading note...</div>
          ) : (
            <textarea
              value={content}
              onChange={(e) => {
                setContent(e.target.value);
                if (contentError) setContentError("");
              }}
              placeholder={`Write your observations here...\n\nUse bullet points for easy reading:\n- Observation 1\n- Observation 2\n- Measurement data`}
              className="w-full min-h-[250px] bg-secondary/50 rounded-xl p-4 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary/50 placeholder:text-muted-foreground leading-relaxed"
              autoFocus
            />
          )}
          {contentError && <p className="text-sm text-destructive">{contentError}</p>}
          <div className="flex items-center justify-between">
            <span className={`text-xs ${isOverLimit ? "text-destructive" : "text-muted-foreground"}`}>
              {wordCount.toLocaleString()}/5,000 words
            </span>
          </div>
        </section>

        {/* Photos are disabled in the web version for now. */}
      </div>
    </div>
  );
};

export default EditNotePage;
