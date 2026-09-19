import { useEffect, useMemo, useRef, useState } from "react";
import { Calendar, HardDrive, Image as ImageIcon, Loader2, PhoneOff, X } from "lucide-react";
import { format } from "date-fns";
import { EmptyState } from "@/components/EmptyState";
import { resetPhotoAccessDecisions, type PhotoMetadata } from "@/services/photoStreaming";
import { resolvePhotoObjectUrl } from "@/services/photoCache";
import { usePhotoLibrary } from "@/hooks/usePhotoLibrary";

type SortBy = "date" | "size";
type StreamState = {
  url?: string;
  objectUrlCreatedAt?: number;
  loading: boolean;
  error?: string;
  transferredBytes: number;
  totalBytes: number;
};

const offlineMessage = "Open ResearchPal on your phone. Your photos are stored on your phone. Open ResearchPal and approve web photo access to continue.";

const formatSize = (bytes: number) => {
  if (!bytes) return "";
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

const photoStateKey = (photo: PhotoMetadata) => `${photo.sourceDeviceId || "no-device"}:${photo.photoId}`;

export default function PhotosPage() {
  const [photos, setPhotos] = useState<PhotoMetadata[]>([]);
  const [sortBy, setSortBy] = useState<SortBy>("date");
  const [selectedPhoto, setSelectedPhoto] = useState<PhotoMetadata | null>(null);
  const [thumbs, setThumbs] = useState<Record<string, StreamState>>({});
  const [detail, setDetail] = useState<StreamState>({ loading: false, transferredBytes: 0, totalBytes: 0 });
  const detailCache = useRef<Record<string, StreamState>>({});
  const requestedThumbs = useRef(new Set<string>());
  const photoLibrary = usePhotoLibrary();
  const loading = photoLibrary.isLoading;
  const loadError = photoLibrary.error instanceof Error ? photoLibrary.error.message : "";

  useEffect(() => {
    const nextPhotos = photoLibrary.data?.photos || [];
    setPhotos(nextPhotos);
    setThumbs(state => {
      const nextPhotoIds = new Set(nextPhotos.map(photoStateKey));
      const nextState: Record<string, StreamState> = {};
      requestedThumbs.current.forEach(photoId => {
        if (!nextPhotoIds.has(photoId)) requestedThumbs.current.delete(photoId);
      });
      for (const [key, streamState] of Object.entries(state)) {
        if (nextPhotoIds.has(key) && streamState.url) nextState[key] = streamState;
      }
      return nextState;
    });
  }, [photoLibrary.data?.photos]);

  useEffect(() => {
    if (selectedPhoto) return;
    const controller = new AbortController();
    const streamablePhotos = photos.slice(0, 24);

    void (async () => {
      for (const photo of streamablePhotos) {
        const key = photoStateKey(photo);
        if (controller.signal.aborted) return;
        if (requestedThumbs.current.has(key)) continue;
        requestedThumbs.current.add(key);
        setThumbs(state => {
          if (state[key]?.url || state[key]?.loading) return state;
          return { ...state, [key]: { loading: true, transferredBytes: 0, totalBytes: 0 } };
        });
        try {
          const result = await resolvePhotoObjectUrl(photo, "thumbnail", progress => {
            setThumbs(state => ({ ...state, [key]: { ...(state[key] || { loading: true }), loading: true, transferredBytes: progress.transferredBytes, totalBytes: progress.totalBytes } }));
          }, controller.signal);
          if (controller.signal.aborted) return;
          setThumbs(state => ({ ...state, [key]: { loading: false, url: result.url, objectUrlCreatedAt: result.objectUrlCreatedAt, transferredBytes: result.blob.size, totalBytes: result.blob.size } }));
        } catch (error) {
          if (controller.signal.aborted) return;
          requestedThumbs.current.delete(key);
          setThumbs(state => ({ ...state, [key]: { loading: false, error: error instanceof Error ? error.message : String(error), transferredBytes: 0, totalBytes: 0 } }));
        }
      }
    })();

    return () => controller.abort();
  }, [photos, selectedPhoto]);

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
    void resolvePhotoObjectUrl(selectedPhoto, "original", progress => {
      setDetail(state => ({ ...state, loading: true, transferredBytes: progress.transferredBytes, totalBytes: progress.totalBytes }));
    }, controller.signal).then(result => {
      if (controller.signal.aborted) return;
      const nextDetail = { loading: false, url: result.url, objectUrlCreatedAt: result.objectUrlCreatedAt, transferredBytes: result.blob.size, totalBytes: result.blob.size };
      detailCache.current[key] = nextDetail;
      setDetail(nextDetail);
    }).catch(error => {
      if (controller.signal.aborted) return;
      setDetail({ loading: false, error: error instanceof Error ? error.message : String(error), transferredBytes: 0, totalBytes: 0 });
    });
    return () => controller.abort();
  }, [selectedPhoto]);

  const sortedPhotos = useMemo(() => [...photos].sort((a, b) => {
    if (sortBy === "date") return new Date(b.capturedAt).getTime() - new Date(a.capturedAt).getTime();
    return (thumbs[photoStateKey(b)]?.totalBytes || 0) - (thumbs[photoStateKey(a)]?.totalBytes || 0);
  }), [photos, sortBy, thumbs]);

  return (
    <div className="px-4 py-6 space-y-6">
      {photos.length > 0 && (
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground">Sort by:</span>
          <button onClick={() => setSortBy("date")} className={`rounded-md px-3 py-1.5 text-xs ${sortBy === "date" ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground"}`}><Calendar size={12} className="mr-1.5 inline" />Date</button>
          <button onClick={() => setSortBy("size")} className={`rounded-md px-3 py-1.5 text-xs ${sortBy === "size" ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground"}`}><HardDrive size={12} className="mr-1.5 inline" />Size</button>
        </div>
      )}

      {loading ? (
        <div className="flex h-64 items-center justify-center text-muted-foreground"><Loader2 className="mr-2 h-5 w-5 animate-spin" />Loading photo metadata...</div>
      ) : loadError ? (
        <EmptyState icon={PhoneOff} title="Unable to load photos" description={loadError} />
      ) : photos.length === 0 ? (
        <EmptyState icon={ImageIcon} title="No photos yet" description="Photos from plot notes will appear here." />
      ) : (
        <>
          {photos.some(photo => !photo.deviceAvailable) && (
            <div className="rounded-md border bg-card p-4 text-sm text-muted-foreground">
              <div className="font-medium text-foreground">Open ResearchPal on your phone</div>
              <p className="mt-1">Your photos are stored on your phone. Open ResearchPal and approve web photo access to continue.</p>
              <button onClick={() => { resetPhotoAccessDecisions(); requestedThumbs.current.clear(); void photoLibrary.refetch(); }} className="mt-3 rounded-md bg-primary px-3 py-1.5 text-xs text-primary-foreground">Try again</button>
            </div>
          )}
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5">
            {sortedPhotos.map(photo => {
              const thumb = thumbs[photoStateKey(photo)];
              return (
                <button key={photoStateKey(photo)} onClick={() => setSelectedPhoto(photo)} className="relative aspect-square overflow-hidden rounded-md border bg-card text-left">
                  {thumb?.url ? <img src={thumb.url} alt="" className="h-full w-full object-cover" onLoad={() => console.log(`PHOTO PERF image-load ${JSON.stringify({ photoId: photo.photoId, variant: "thumbnail", objectUrlToImageLoadMs: thumb.objectUrlCreatedAt ? Math.round(performance.now() - thumb.objectUrlCreatedAt) : null })}`)} /> : (
                    <div className="flex h-full flex-col items-center justify-center gap-2 p-3 text-center text-xs text-muted-foreground">
                      {photo.deviceAvailable ? <Loader2 className="h-5 w-5 animate-spin" /> : <PhoneOff className="h-5 w-5" />}
                      <span>{photo.deviceAvailable ? "Loading thumbnail" : "Phone offline"}</span>
                    </div>
                  )}
                  {thumb?.error && <div className="absolute inset-x-0 bottom-0 bg-destructive/90 p-2 text-xs text-destructive-foreground">{thumb.error}</div>}
                </button>
              );
            })}
          </div>
        </>
      )}

      {selectedPhoto && (
        <div className="fixed inset-0 z-50 flex flex-col bg-background">
          <div className="flex items-center justify-between border-b p-4">
            <button onClick={() => setSelectedPhoto(null)} className="rounded-md p-2 hover:bg-secondary"><X size={22} /></button>
            <span className="text-sm text-muted-foreground">{format(new Date(selectedPhoto.capturedAt), "MMM d, yyyy")}</span>
          </div>
          <div className="flex min-h-0 flex-1 items-center justify-center p-4">
            {detail.url ? <img src={detail.url} alt="" className="max-h-full max-w-full rounded-md object-contain" onLoad={() => console.log(`PHOTO PERF image-load ${JSON.stringify({ photoId: selectedPhoto.photoId, variant: "original", objectUrlToImageLoadMs: detail.objectUrlCreatedAt ? Math.round(performance.now() - detail.objectUrlCreatedAt) : null })}`)} /> : (
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
  );
}
