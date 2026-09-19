import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { Save, Trash2, Calendar, Image as ImageIcon, Loader2, PhoneOff, X } from "lucide-react";
import { format } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import {
  addPlotNoteService,
  deletePlotNoteService,
  getPlotNotesService,
  updatePlotNoteService,
  type PlotNoteDto,
} from "@/services/projects";
import { usePhotoLibrary } from "@/hooks/usePhotoLibrary";
import { resolvePhotoObjectUrl } from "@/services/photoCache";
import type { PhotoMetadata } from "@/services/photoStreaming";
import { validateRequiredMaxLength } from "@/utils/apiValidation";

const noteText = (note: PlotNoteDto) => note.content?.[0]?.note?.join("\n") || "";
const isObjectId = (value?: string) => /^[a-f\d]{24}$/i.test(value || "");
const offlineMessage = "Photos are stored on your phone. Open ResearchPal on that device to view them.";

type StreamState = {
  url?: string;
  objectUrlCreatedAt?: number;
  loading: boolean;
  error?: string;
  transferredBytes: number;
  totalBytes: number;
};

const formatSize = (bytes: number) => {
  if (!bytes) return "";
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

const photoStateKey = (photo: PhotoMetadata) => `${photo.sourceDeviceId || "no-device"}:${photo.photoId}`;

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
  const [thumbs, setThumbs] = useState<Record<string, StreamState>>({});
  const [detail, setDetail] = useState<StreamState>({ loading: false, transferredBytes: 0, totalBytes: 0 });
  const detailCache = useRef<Record<string, StreamState>>({});
  const requestedThumbs = useRef(new Set<string>());
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

  useEffect(() => {
    const availablePhotoIds = new Set(notePhotos.map(photoStateKey));
    requestedThumbs.current.forEach((key) => {
      if (!availablePhotoIds.has(key)) requestedThumbs.current.delete(key);
    });
    setThumbs((state) => {
      const next = Object.fromEntries(Object.entries(state).filter(([key]) => availablePhotoIds.has(key)));
      return Object.keys(next).length === Object.keys(state).length ? state : next;
    });
  }, [notePhotos]);

  useEffect(() => {
    if (isNewNote || !notePhotos.length) return;
    const controller = new AbortController();
    const effectRequestedPhotoIds = new Set<string>();

    void (async () => {
      for (const photo of notePhotos) {
        const key = photoStateKey(photo);
        if (controller.signal.aborted) return;
        if (requestedThumbs.current.has(key)) continue;

        requestedThumbs.current.add(key);
        effectRequestedPhotoIds.add(key);

        setThumbs((state) => ({
          ...state,
          [key]: { loading: true, transferredBytes: 0, totalBytes: 0 },
        }));

        try {
          const result = await resolvePhotoObjectUrl(photo, "thumbnail", (progress) => {
            if (controller.signal.aborted) return;
            setThumbs((state) => ({
              ...state,
              [key]: {
                ...(state[key] || { loading: true }),
                loading: true,
                transferredBytes: progress.transferredBytes,
                totalBytes: progress.totalBytes,
              },
            }));
          }, controller.signal);
          if (controller.signal.aborted) {
            requestedThumbs.current.delete(key);
            return;
          }
          console.log(`PHOTO PERF note-thumbnail-ready ${JSON.stringify({ photoId: photo.photoId, blobBytes: result.blob.size, cacheHit: result.cacheHit })}`);
          setThumbs((state) => ({
            ...state,
            [key]: { loading: false, url: result.url, objectUrlCreatedAt: result.objectUrlCreatedAt, transferredBytes: result.blob.size, totalBytes: result.blob.size },
          }));
        } catch (error) {
          requestedThumbs.current.delete(key);
          if (controller.signal.aborted) {
            setThumbs((state) => {
              const current = state[key];
              if (!current?.loading || current.url) return state;
              return {
                ...state,
                [key]: { loading: false, transferredBytes: current.transferredBytes || 0, totalBytes: current.totalBytes || 0 },
              };
            });
            return;
          }
          setThumbs((state) => ({
            ...state,
            [key]: {
              loading: false,
              error: error instanceof Error ? error.message : String(error),
              transferredBytes: 0,
              totalBytes: 0,
            },
          }));
        }
      }
    })();

    return () => {
      controller.abort();
      effectRequestedPhotoIds.forEach((photoId) => {
        const current = thumbs[photoId];
        if (!current?.url) requestedThumbs.current.delete(photoId);
      });
    };
  }, [isNewNote, notePhotos]);

  useEffect(() => {
    if (!selectedPhoto) return;
    const key = photoStateKey(selectedPhoto);
    const cachedDetail = detailCache.current[key];
    if (cachedDetail?.url) {
      setDetail(cachedDetail);
      return;
    }

    const controller = new AbortController();
    setDetail({ loading: true, transferredBytes: 0, totalBytes: 0 });

    void resolvePhotoObjectUrl(selectedPhoto, "original", (progress) => {
      setDetail((state) => ({
        ...state,
        loading: true,
        transferredBytes: progress.transferredBytes,
        totalBytes: progress.totalBytes,
      }));
    }, controller.signal).then((result) => {
      if (controller.signal.aborted) return;
      const nextDetail = { loading: false, url: result.url, objectUrlCreatedAt: result.objectUrlCreatedAt, transferredBytes: result.blob.size, totalBytes: result.blob.size };
      detailCache.current[key] = nextDetail;
      setDetail(nextDetail);
    }).catch((error) => {
      if (controller.signal.aborted) return;
      setDetail({
        loading: false,
        error: error instanceof Error ? error.message : String(error),
        transferredBytes: 0,
        totalBytes: 0,
      });
    });

    return () => controller.abort();
  }, [selectedPhoto]);

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
                {notePhotos.map((photo) => {
                  const key = photoStateKey(photo);
                  const thumb = thumbs[key];
                  return (
                    <button
                      key={key}
                      type="button"
                      onClick={() => setSelectedPhoto(photo)}
                      className="relative aspect-square overflow-hidden rounded-lg border border-border bg-card text-left"
                    >
                      {thumb?.url ? (
                        <img
                          src={thumb.url}
                          alt=""
                          className="h-full w-full object-cover"
                          onLoad={() => console.log(`PHOTO PERF image-load ${JSON.stringify({ photoId: photo.photoId, variant: "thumbnail", objectUrlToImageLoadMs: thumb.objectUrlCreatedAt ? Math.round(performance.now() - thumb.objectUrlCreatedAt) : null })}`)}
                        />
                      ) : (
                        <div className="flex h-full flex-col items-center justify-center gap-2 p-2 text-center text-[11px] text-muted-foreground">
                          {photo.deviceAvailable ? <Loader2 className="h-4 w-4 animate-spin" /> : <PhoneOff className="h-4 w-4" />}
                          <span>{photo.deviceAvailable ? "Loading" : "Phone offline"}</span>
                        </div>
                      )}
                      {thumb?.error && (
                        <div className="absolute inset-x-0 bottom-0 bg-destructive/90 p-1 text-[10px] text-destructive-foreground">
                          {thumb.error}
                        </div>
                      )}
                    </button>
                  );
                })}
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
              {detail.url ? (
                <img
                  src={detail.url}
                  alt=""
                  className="max-h-full max-w-full rounded-md object-contain"
                  onLoad={() => console.log(`PHOTO PERF image-load ${JSON.stringify({ photoId: selectedPhoto.photoId, variant: "original", objectUrlToImageLoadMs: detail.objectUrlCreatedAt ? Math.round(performance.now() - detail.objectUrlCreatedAt) : null })}`)}
                />
              ) : (
                <div className="max-w-sm text-center text-sm text-muted-foreground">
                  {detail.loading ? <Loader2 className="mx-auto mb-3 h-6 w-6 animate-spin" /> : <PhoneOff className="mx-auto mb-3 h-6 w-6" />}
                  <p>{detail.error || (selectedPhoto.deviceAvailable ? "Streaming encrypted photo from your phone..." : offlineMessage)}</p>
                  {detail.totalBytes > 0 && <p className="mt-2">{formatSize(detail.transferredBytes)} / {formatSize(detail.totalBytes)}</p>}
                </div>
              )}
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
