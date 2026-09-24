import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { Save, Trash2, Calendar, Image as ImageIcon, Loader2, X, Upload } from "lucide-react";
import { format } from "date-fns";
import { CloudPhotoImage } from "@/components/CloudPhotoImage";
import { useToast } from "@/hooks/use-toast";
import {
  addPlotNoteService,
  deletePlotNoteService,
  getPlotNotesService,
  updatePlotNoteService,
  type PlotNoteDto,
} from "@/services/projects";
import { usePhotoLibrary } from "@/hooks/usePhotoLibrary";
import { uploadPhoto, type PhotoMetadata } from "@/services/photos";
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
  const [selectedPhoto, setSelectedPhoto] = useState<PhotoMetadata | null>(null);
  const [pendingPhotoFiles, setPendingPhotoFiles] = useState<File[]>([]);
  const photoLibrary = usePhotoLibrary({ enabled: !isNewNote });
  const wordCount = content.trim().split(/\s+/).filter(Boolean).length;
  const isOverLimit = wordCount > 5000;
  const hasInvalidExistingPlotId = !isNewNote && Boolean(plotId) && !isObjectId(plotId);
  const showNoteLoading = isLoading && !hasInvalidExistingPlotId;
  const notePhotos = useMemo(
    () => (photoLibrary.data?.photos || []).filter((photo) =>
      photo.projectId === projectId && photo.plotId === plotId && photo.noteId === noteId
    ),
    [noteId, photoLibrary.data?.photos, plotId, projectId],
  );

  useEffect(() => {
    if (isNewNote || !projectId || !plotId || !noteId) return;
    if (!isObjectId(plotId)) {
      toast({
        title: "Unable to load note",
        description: "Plot link is invalid. Open notes from the project plot grid.",
        variant: "destructive",
      });
      return;
    }

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
        const created = await addPlotNoteService({ projectId, plotId, content: lines });
        if (pendingPhotoFiles.length) {
          const uploaded = await Promise.all(pendingPhotoFiles.map(file =>
            uploadPhoto(file, { projectId, plotId, noteId: created._id }, noteDate.toISOString()),
          ));
          await updatePlotNoteService({
            projectId,
            plotId,
            noteId: created._id,
            content: lines,
            photoIds: uploaded.map(photo => photo.photoId),
          });
        }
        toast({ title: "Note created" });
      } else {
        const uploaded = pendingPhotoFiles.length
          ? await Promise.all(pendingPhotoFiles.map(file =>
              uploadPhoto(file, { projectId, plotId, noteId }, noteDate.toISOString()),
            ))
          : [];
        await updatePlotNoteService({
          projectId,
          plotId,
          noteId,
          content: lines,
          photoIds: [...notePhotos.map(photo => photo.photoId), ...uploaded.map(photo => photo.photoId)],
        });
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
              disabled={isSaving || showNoteLoading || isOverLimit || !content.trim()}
              className="flex items-center gap-1.5 px-4 py-2 rounded-full bg-primary text-primary-foreground text-sm font-medium disabled:opacity-50"
            >
              <Save size={16} />
              {isSaving ? "Saving..." : "Save"}
            </button>
          </div>
        </section>

        <section className="glass-card p-4 space-y-4">
          {showNoteLoading ? (
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

        <section className="glass-card p-4 space-y-3">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <ImageIcon size={16} className="text-primary" />
              <h3 className="text-sm font-semibold text-foreground">Attach Photos</h3>
            </div>
            <label className="inline-flex cursor-pointer items-center gap-1.5 rounded-md bg-secondary px-3 py-2 text-sm font-medium text-foreground hover:bg-secondary/80">
              <Upload size={15} />
              Add
              <input
                type="file"
                accept="image/*"
                multiple
                className="hidden"
                onChange={(event) => {
                  const files = Array.from(event.target.files || []).filter(file => file.type.startsWith("image/"));
                  setPendingPhotoFiles(previous => [...previous, ...files]);
                  event.currentTarget.value = "";
                }}
              />
            </label>
          </div>
          {pendingPhotoFiles.length > 0 && (
            <div className="grid grid-cols-3 gap-2">
              {pendingPhotoFiles.map((file, index) => (
                <div key={`${file.name}-${file.lastModified}-${index}`} className="relative rounded-md bg-secondary/40 p-2 text-xs text-muted-foreground">
                  <span className="block truncate">{file.name}</span>
                  <button
                    type="button"
                    onClick={() => setPendingPhotoFiles(files => files.filter((_, itemIndex) => itemIndex !== index))}
                    className="absolute right-1 top-1 rounded bg-background/80 p-1"
                    aria-label="Remove photo"
                  >
                    <X size={12} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </section>

        {!isNewNote && (
          <section className="glass-card p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ImageIcon size={16} className="text-primary" />
                <h3 className="text-sm font-semibold text-foreground">Photos ({notePhotos.length})</h3>
              </div>
              {photoLibrary.isFetching && !notePhotos.length && (
                <Loader2 size={14} className="animate-spin text-muted-foreground" />
              )}
            </div>

            {photoLibrary.isLoading ? (
              <div className="rounded-xl bg-secondary/40 p-4 text-sm text-muted-foreground">Loading photo metadata...</div>
            ) : notePhotos.length === 0 ? (
              <div className="rounded-xl bg-secondary/40 p-4 text-sm text-muted-foreground">No photos attached to this note.</div>
            ) : (
              <div className="grid grid-cols-3 gap-2">
                {notePhotos.map((photo) => (
                    <button
                      key={photo.photoId}
                      type="button"
                      onClick={() => setSelectedPhoto(photo)}
                      className="relative aspect-square overflow-hidden rounded-lg border border-border bg-card text-left"
                    >
                      <CloudPhotoImage photo={photo} variant="thumbnail" className="h-full w-full object-cover" />
                    </button>
                ))}
              </div>
            )}
          </section>
        )}

        {selectedPhoto && (
          <div className="fixed inset-0 z-50 flex flex-col bg-background">
            <div className="flex items-center justify-between border-b p-4">
              <button onClick={() => setSelectedPhoto(null)} className="rounded-md p-2 hover:bg-secondary">
                <X size={22} />
              </button>
              <span className="text-sm text-muted-foreground">{format(new Date(selectedPhoto.capturedAt), "MMM d, yyyy")}</span>
            </div>
            <div className="flex min-h-0 flex-1 items-center justify-center p-4">
              <CloudPhotoImage photo={selectedPhoto} variant="standard" className="max-h-full max-w-full rounded-md object-contain" />
            </div>
            <div className="border-t bg-card p-4 text-sm">
              <div className="font-medium">{selectedPhoto.projectTitle || "Research photo"}</div>
              <div className="mt-1 text-muted-foreground">{selectedPhoto.plotTitle || selectedPhoto.plotId}</div>
              {selectedPhoto.notePreview && <p className="mt-3 leading-relaxed">{selectedPhoto.notePreview}</p>}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default EditNotePage;
