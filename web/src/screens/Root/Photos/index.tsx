import { useState } from "react";
import { Image as ImageIcon, X, Calendar, HardDrive, FileText, Grid3X3 } from "lucide-react";
import { PhotoGrid } from "@/components/PhotoGrid";
import type { Photo } from "@/components/PhotoGrid";
import { EmptyState } from "@/components/EmptyState";
import { format } from "date-fns";

// Mock photos
const mockPhotos: Photo[] = [
  {
    id: "1",
    url: "https://images.unsplash.com/photo-1416879595882-3373a0480b5b?w=400&h=400&fit=crop",
    context: { 
      type: "plot", 
      projectName: "Wheat Study", 
      plotId: "R1_T2", 
      replication: "R1",
      treatment: "T2",
      notePreview: "Initial germination observed. Seedlings showing strong emergence pattern across the plot. Soil moisture levels appear optimal for continued growth." 
    },
    createdAt: new Date(),
    size: 2400000,
  },
  {
    id: "2",
    url: "https://images.unsplash.com/photo-1574943320219-553eb213f72d?w=400&h=400&fit=crop",
    context: { type: "diary", notePreview: "Morning field visit completed. Checked irrigation systems and noted temperature variations across different zones." },
    createdAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
    size: 1800000,
  },
  {
    id: "3",
    url: "https://images.unsplash.com/photo-1523348837708-15d4a09cfac2?w=400&h=400&fit=crop",
    context: { type: "idea", notePreview: "Leaf coloration study - noticed unusual yellowing pattern that may indicate nutrient deficiency." },
    createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
    size: 3100000,
  },
  {
    id: "4",
    url: "https://images.unsplash.com/photo-1530836369250-ef72a3f5cda8?w=400&h=400&fit=crop",
    context: { 
      type: "plot", 
      projectName: "Tomato Trial", 
      plotId: "R2_T4", 
      replication: "R2",
      treatment: "T4",
      notePreview: "Height measurements taken. Plants in this treatment showing 15% greater height compared to control group." 
    },
    createdAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
    size: 2200000,
  },
  {
    id: "5",
    url: "https://images.unsplash.com/photo-1464226184884-fa280b87c399?w=400&h=400&fit=crop",
    context: { type: "diary", notePreview: "Team meeting notes - discussed next phase of experiment and resource allocation." },
    createdAt: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000),
    size: 1500000,
  },
  {
    id: "6",
    url: "https://images.unsplash.com/photo-1500595046743-cd271d694d30?w=400&h=400&fit=crop",
    context: { 
      type: "plot", 
      projectName: "Soil Study", 
      plotId: "R3_T1",
      replication: "R3",
      treatment: "T1"
    },
    createdAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
    size: 2800000,
  },
];

type SortBy = "date" | "size";
type DetailView = "plot" | "notes";

const PhotosPage = () => {
  const [photos] = useState<Photo[]>(mockPhotos);
  const [sortBy, setSortBy] = useState<SortBy>("date");
  const [selectedPhoto, setSelectedPhoto] = useState<Photo | null>(null);
  const [detailView, setDetailView] = useState<DetailView>("plot");

  const sortedPhotos = [...photos].sort((a, b) => {
    if (sortBy === "date") {
      return b.createdAt.getTime() - a.createdAt.getTime();
    } else {
      return (b.size || 0) - (a.size || 0);
    }
  });

  const formatSize = (bytes: number) => {
    if (bytes < 1024 * 1024) {
      return `${(bytes / 1024).toFixed(0)} KB`;
    }
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const handlePhotoClick = (photo: Photo) => {
    setSelectedPhoto(photo);
    setDetailView("plot"); // Reset to plot view when opening new photo
  };

  return (
    <div className="mobile-container bg-background">
      <div className="safe-bottom px-4 py-6 space-y-6">
        {/* Sort options */}
        {photos.length > 0 && (
          <div className="flex items-center gap-2 stagger-item" style={{ animationDelay: "100ms" }}>
            <span className="text-xs text-muted-foreground">Sort by:</span>
            <div className="flex gap-2">
              <button
                onClick={() => setSortBy("date")}
                className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                  sortBy === "date"
                    ? "bg-primary text-primary-foreground"
                    : "bg-secondary text-muted-foreground"
                }`}
              >
                <Calendar size={12} className="inline mr-1.5" />
                Date
              </button>
              <button
                onClick={() => setSortBy("size")}
                className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                  sortBy === "size"
                    ? "bg-primary text-primary-foreground"
                    : "bg-secondary text-muted-foreground"
                }`}
              >
                <HardDrive size={12} className="inline mr-1.5" />
                Size
              </button>
            </div>
          </div>
        )}

        {/* Photos Grid */}
        {photos.length === 0 ? (
          <EmptyState
            icon={ImageIcon}
            title="No photos yet"
            description="Photos from your research notes, diary entries, and ideas will appear here."
          />
        ) : (
          <div className="stagger-item" style={{ animationDelay: "200ms" }}>
            <PhotoGrid photos={sortedPhotos} onPhotoClick={handlePhotoClick} />
          </div>
        )}
      </div>

      {/* Photo Detail Modal */}
      {selectedPhoto && (
        <div className="fixed inset-0 z-50 bg-background flex flex-col animate-fade-in">
          <div className="flex items-center justify-between p-4">
            <button
              onClick={() => setSelectedPhoto(null)}
              className="p-2 rounded-full hover:bg-secondary transition-colors"
            >
              <X size={24} className="text-foreground" />
            </button>
            <span className="text-sm text-muted-foreground">
              {format(selectedPhoto.createdAt, "MMM d, yyyy")}
            </span>
          </div>

          {/* Image */}
          <div className="flex-1 flex items-center justify-center p-4 min-h-0">
            <img
              src={selectedPhoto.url}
              alt=""
              className="max-w-full max-h-full object-contain rounded-xl"
            />
          </div>

          {/* View Toggle */}
          <div className="px-4 pb-2">
            <div className="flex gap-2 bg-secondary/50 p-1 rounded-full">
              <button
                onClick={() => setDetailView("plot")}
                className={`flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                  detailView === "plot"
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground"
                }`}
              >
                <Grid3X3 size={16} />
                Plot Details
              </button>
              <button
                onClick={() => setDetailView("notes")}
                className={`flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                  detailView === "notes"
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground"
                }`}
              >
                <FileText size={16} />
                View Notes
              </button>
            </div>
          </div>

          {/* Context Info */}
          <div className="p-4 bg-card border-t border-border">
            {detailView === "plot" ? (
              // Plot Details View
              <div className="space-y-3">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="px-2 py-1 rounded-lg bg-primary/10 text-primary text-xs font-medium capitalize">
                    {selectedPhoto.context?.type || "Unknown"}
                  </span>
                  {selectedPhoto.context?.plotId && (
                    <span className="px-2 py-1 rounded-lg bg-secondary text-foreground text-xs font-medium">
                      {selectedPhoto.context.plotId}
                    </span>
                  )}
                  {selectedPhoto.size && (
                    <span className="text-xs text-muted-foreground ml-auto">
                      {formatSize(selectedPhoto.size)}
                    </span>
                  )}
                </div>
                
                {selectedPhoto.context?.projectName && (
                  <div className="space-y-1">
                    <p className="text-xs text-muted-foreground">Project</p>
                    <p className="text-sm font-medium text-foreground">
                      {selectedPhoto.context.projectName}
                    </p>
                  </div>
                )}
                
                {(selectedPhoto.context?.replication || selectedPhoto.context?.treatment) && (
                  <div className="flex gap-6">
                    {selectedPhoto.context?.replication && (
                      <div className="space-y-1">
                        <p className="text-xs text-muted-foreground">Replication</p>
                        <p className="text-sm font-medium text-foreground">
                          {selectedPhoto.context.replication}
                        </p>
                      </div>
                    )}
                    {selectedPhoto.context?.treatment && (
                      <div className="space-y-1">
                        <p className="text-xs text-muted-foreground">Treatment</p>
                        <p className="text-sm font-medium text-foreground">
                          {selectedPhoto.context.treatment}
                        </p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ) : (
              // Notes View
              <div className="space-y-2">
                <p className="text-xs text-muted-foreground font-medium">Related Notes</p>
                {selectedPhoto.context?.notePreview ? (
                  <p className="text-sm text-foreground leading-relaxed">
                    {selectedPhoto.context.notePreview}
                  </p>
                ) : (
                  <p className="text-sm text-muted-foreground italic">
                    No notes associated with this photo.
                  </p>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default PhotosPage;
