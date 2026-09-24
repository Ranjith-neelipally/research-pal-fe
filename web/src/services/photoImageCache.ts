import type { PhotoMetadata, PhotoVariant } from "@/services/photos";
import { api } from "@/services/api";

const DB_NAME = "research-pal-photo-cache";
const DB_VERSION = 1;
const STORE_NAME = "decrypted-photos";
const objectUrls = new Map<string, string>();

function openPhotoDb() {
  return new Promise<IDBDatabase>((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      request.result.createObjectStore(STORE_NAME);
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

const cacheKey = (photoId: string, variant: PhotoVariant) => `${photoId}:${variant}`;

async function readCachedBlob(key: string) {
  const db = await openPhotoDb();
  return new Promise<Blob | null>((resolve, reject) => {
    const request = db.transaction(STORE_NAME, "readonly").objectStore(STORE_NAME).get(key);
    request.onsuccess = () => resolve(request.result instanceof Blob ? request.result : null);
    request.onerror = () => reject(request.error);
  }).finally(() => db.close());
}

async function writeCachedBlob(key: string, blob: Blob) {
  const db = await openPhotoDb();
  return new Promise<void>((resolve, reject) => {
    const request = db.transaction(STORE_NAME, "readwrite").objectStore(STORE_NAME).put(blob, key);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  }).finally(() => db.close());
}

async function fetchPhoto(photo: PhotoMetadata, variant: PhotoVariant) {
  const variantPayload = photo.variants[variant];
  const response = await api.get<Blob>(variantPayload.url, { responseType: "blob" });
  return new Blob([response.data], { type: variantPayload.mimeType });
}

function objectUrlFor(key: string, blob: Blob) {
  const existing = objectUrls.get(key);
  if (existing) return existing;
  const url = URL.createObjectURL(blob);
  objectUrls.set(key, url);
  return url;
}

export async function getPhotoObjectUrl(photo: PhotoMetadata, variant: PhotoVariant = "standard") {
  const key = cacheKey(photo.photoId, variant);
  const cached = await readCachedBlob(key);
  if (cached) return objectUrlFor(key, cached);
  const fetched = await fetchPhoto(photo, variant);
  await writeCachedBlob(key, fetched);
  return objectUrlFor(key, fetched);
}

export async function removeCachedPhoto(photoId: string) {
  objectUrls.forEach((url, key) => {
    if (key.startsWith(`${photoId}:`)) URL.revokeObjectURL(url);
  });
  [...objectUrls.keys()].forEach((key) => {
    if (key.startsWith(`${photoId}:`)) objectUrls.delete(key);
  });
  const db = await openPhotoDb();
  return new Promise<void>((resolve, reject) => {
    const store = db.transaction(STORE_NAME, "readwrite").objectStore(STORE_NAME);
    const request = store.openCursor();
    request.onsuccess = () => {
      const cursor = request.result;
      if (!cursor) {
        resolve();
        return;
      }
      if (typeof cursor.key === "string" && cursor.key.startsWith(`${photoId}:`)) cursor.delete();
      cursor.continue();
    };
    request.onerror = () => reject(request.error);
  }).finally(() => db.close());
}

export async function clearResearchPalPhotoCache() {
  objectUrls.forEach((url) => URL.revokeObjectURL(url));
  objectUrls.clear();
  const db = await openPhotoDb();
  return new Promise<void>((resolve, reject) => {
    const request = db.transaction(STORE_NAME, "readwrite").objectStore(STORE_NAME).clear();
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  }).finally(() => db.close());
}
