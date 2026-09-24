import { api } from "@/services/api";

export type PhotoVariant = "original" | "standard" | "thumbnail";
export interface PhotoVariantPayload {
  storageId: string;
  url: string;
  mimeType: string;
}

export interface PhotoMetadata {
  photoId: string;
  userId: string;
  projectId: string;
  plotId: string;
  noteId: string | null;
  variants: Record<PhotoVariant, PhotoVariantPayload>;
  capturedAt: string;
  projectTitle?: string | null;
  plotTitle?: string | null;
  replication?: number;
  treatment?: number;
  notePreview?: string;
}

export async function getPhotoLibrary() {
  return (await api.get<{ photos: PhotoMetadata[] }>("/photos/library")).data;
}

export async function deletePhoto(photoId: string) {
  await api.delete(`/photos/${encodeURIComponent(photoId)}`);
  const { removeCachedPhoto } = await import("@/services/photoImageCache");
  await removeCachedPhoto(photoId);
}

const STANDARD_SETTINGS = { maxDimension: 1920, quality: 0.82 };
const THUMBNAIL_SETTINGS = { maxDimension: 360, quality: 0.72 };
const isImageFile = (file: File) => file.type.startsWith("image/");

function createPhotoId() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

async function resizeImage(file: File, settings: { maxDimension: number; quality: number }) {
  const bitmap = await createImageBitmap(file);
  try {
    const scale = Math.min(1, settings.maxDimension / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(bitmap.width * scale));
    canvas.height = Math.max(1, Math.round(bitmap.height * scale));
    const context = canvas.getContext("2d");
    if (!context) throw new Error("Image processing is unavailable.");
    context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    return await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob(blob => blob ? resolve(blob) : reject(new Error("Unable to process image.")), "image/jpeg", settings.quality);
    });
  } finally {
    bitmap.close();
  }
}

export async function preparePhotoVariants(file: File) {
  if (!isImageFile(file)) return { original: file, standard: null, thumbnail: null };
  const compressed = await resizeImage(file, STANDARD_SETTINGS);
  const original = compressed || file;
  const thumbnail = await resizeImage(file, THUMBNAIL_SETTINGS);
  return { original, standard: null, thumbnail };
}

export async function uploadPhoto(
  file: File,
  relationship: { projectId: string; plotId: string; noteId?: string },
  capturedAt = new Date().toISOString(),
) {
  const variants = await preparePhotoVariants(file);
  const photoId = createPhotoId();
  const form = new FormData();
  form.append("projectId", relationship.projectId);
  form.append("plotId", relationship.plotId);
  form.append("photoId", photoId);
  form.append("idempotencyKey", photoId);
  if (relationship.noteId) form.append("noteId", relationship.noteId);
  form.append("capturedAt", capturedAt);
  form.append("original", variants.original, file.name || `${photoId}.jpg`);
  if (variants.standard) form.append("standard", variants.standard, "standard.jpg");
  if (variants.thumbnail) form.append("thumbnail", variants.thumbnail, "thumbnail.jpg");
  const response = await api.post<{ photo: PhotoMetadata }>("/photos/upload", form, {
    headers: { "Content-Type": "multipart/form-data" },
    timeout: 120000,
  });
  return response.data.photo;
}
