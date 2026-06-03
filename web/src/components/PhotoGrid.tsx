export interface Photo {
  id: string;
  url: string;
  context?: {
    type: "idea" | "diary" | "plot";
    projectName?: string;
    plotId?: string;
    replication?: string;
    treatment?: string;
    notePreview?: string;
  };
  createdAt: Date;
  size?: number;
}

interface PhotoGridProps {
  photos: Photo[];
  onPhotoClick: (photo: Photo) => void;
}

export const PhotoGrid = ({ photos, onPhotoClick }: PhotoGridProps) => {
  return (
    <div className="grid grid-cols-3 gap-1.5">
      {photos.map((photo, idx) => (
        <button
          key={photo.id}
          onClick={() => onPhotoClick(photo)}
          className="photo-grid-item stagger-item"
          style={{ animationDelay: `${idx * 30}ms` }}
        >
          <img 
            src={photo.url} 
            alt=""
            loading="lazy"
          />
        </button>
      ))}
    </div>
  );
};
