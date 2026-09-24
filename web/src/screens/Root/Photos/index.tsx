import { useMemo, useState } from "react";
import { Calendar, Image as ImageIcon, Loader2, Trash2, X } from "lucide-react";
import { format } from "date-fns";
import { EmptyState } from "@/components/EmptyState";
import { CloudPhotoImage } from "@/components/CloudPhotoImage";
import { usePhotoLibrary } from "@/hooks/usePhotoLibrary";
import { deletePhoto, type PhotoMetadata } from "@/services/photos";
import { useToast } from "@/hooks/use-toast";

type SortBy = "date";

export default function PhotosPage() {
  const [sortBy, setSortBy] = useState<SortBy>("date");
  const [selectedPhoto, setSelectedPhoto] = useState<PhotoMetadata | null>(null);
  const [deleting, setDeleting] = useState(false);
  const { toast } = useToast();
  const library = usePhotoLibrary();
  const photos = useMemo(() => [...(library.data?.photos || [])].sort((a, b) => (
    new Date(b.capturedAt).getTime() - new Date(a.capturedAt).getTime()
  )), [library.data?.photos, sortBy]);
  const loadError = library.error instanceof Error ? library.error.message : "";

  const removeSelected = async () => {
    if (!selectedPhoto || deleting || !window.confirm("Delete this photo from ResearchPal and cloud storage?")) return;
    setDeleting(true);
    try {
      await deletePhoto(selectedPhoto.photoId);
      setSelectedPhoto(null);
      await library.refetch();
    } catch {
      toast({ title: "Delete failed", description: "Unable to delete this photo. Please try again.", variant: "destructive" });
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="px-4 py-6 space-y-6">
      {photos.length > 0 && (
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground">Sort by:</span>
          <button onClick={() => setSortBy("date")} className={`rounded-md px-3 py-1.5 text-xs ${sortBy === "date" ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground"}`}><Calendar size={12} className="mr-1.5 inline" />Date</button>
        </div>
      )}
      {library.isLoading ? (
        <div className="flex h-64 items-center justify-center text-muted-foreground"><Loader2 className="mr-2 h-5 w-5 animate-spin" />Loading photos...</div>
      ) : loadError ? (
        <EmptyState icon={ImageIcon} title="Unable to load photos" description="Please try again." />
      ) : photos.length === 0 ? (
        <EmptyState icon={ImageIcon} title="No photos yet" description="Photos attached to plot notes will appear here." />
      ) : (
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5">
          {photos.map(photo => (
            <button key={photo.photoId} onClick={() => setSelectedPhoto(photo)} className="relative aspect-square overflow-hidden rounded-md border bg-card text-left">
              <CloudPhotoImage photo={photo} variant="thumbnail" className="h-full w-full object-cover" />
            </button>
          ))}
        </div>
      )}
      {selectedPhoto && (
        <div className="fixed inset-0 z-50 flex flex-col bg-background">
          <div className="flex items-center justify-between border-b p-4">
            <button onClick={() => setSelectedPhoto(null)} className="rounded-md p-2 hover:bg-secondary"><X size={22} /></button>
            <span className="text-sm text-muted-foreground">{format(new Date(selectedPhoto.capturedAt), "MMM d, yyyy")}</span>
            <button disabled={deleting} onClick={() => void removeSelected()} className="rounded-md p-2 text-destructive hover:bg-destructive/10 disabled:opacity-50">{deleting ? <Loader2 className="h-5 w-5 animate-spin" /> : <Trash2 size={20} />}</button>
          </div>
          <div className="flex min-h-0 flex-1 items-center justify-center p-4"><CloudPhotoImage photo={selectedPhoto} variant="standard" className="max-h-full max-w-full rounded-md object-contain" /></div>
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
