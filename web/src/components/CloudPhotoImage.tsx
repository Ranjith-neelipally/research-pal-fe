import { useEffect, useState } from "react";
import { Image as ImageIcon, Loader2 } from "lucide-react";
import { getPhotoObjectUrl } from "@/services/photoImageCache";
import type { PhotoMetadata, PhotoVariant } from "@/services/photos";

type CloudPhotoImageProps = {
  photo: PhotoMetadata;
  className: string;
  variant?: PhotoVariant;
};

export function CloudPhotoImage({ photo, className, variant = "standard" }: CloudPhotoImageProps) {
  const [src, setSrc] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setFailed(false);
    getPhotoObjectUrl(photo, variant)
      .then((url) => {
        if (!cancelled) setSrc(url);
      })
      .catch(() => {
        if (!cancelled) setFailed(true);
      });
    return () => {
      cancelled = true;
    };
  }, [photo, variant]);

  if (src) {
    return <img src={src} alt="Research photo" className={className} />;
  }
  return (
    <div className={`${className} flex items-center justify-center bg-secondary text-muted-foreground`}>
      {failed ? <ImageIcon size={18} /> : <Loader2 size={18} className="animate-spin" />}
    </div>
  );
}
