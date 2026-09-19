import { streamPhotoFromMobile, type PhotoMetadata } from "@/services/photoStreaming";
import { enqueueThumbnailTransfer } from "@/services/photoTransferQueue";

type PhotoVariant = "thumbnail" | "original";
type ProgressHandler = (progress: { transferredBytes: number; totalBytes: number; chunksReceived: number; totalChunks: number }) => void;

type CachedPhotoRecord = {
  key: string;
  blob: Blob;
  updatedAt: number;
};

type CachedObjectUrl = {
  url: string;
  blob: Blob;
  objectUrlCreatedAt: number;
};

type InFlightPhotoRequest = {
  promise: Promise<CachedObjectUrl>;
  startedAt: number;
};

type PhotoCacheMessage =
  | { type: "fetching"; key: string; ownerId: string; sentAt: number }
  | { type: "ready"; key: string; ownerId: string; sentAt: number }
  | { type: "failed"; key: string; ownerId: string; error: string; sentAt: number };

const DB_NAME = "researchpal-photo-cache";
const DB_VERSION = 1;
const STORE_NAME = "photos";
const CACHE_VERSION = "schema-v1";
const LOCK_TTL_MS = 45_000;
const WAIT_TIMEOUT_MS = 60_000;
const IN_FLIGHT_TTL_MS = 60_000;
const tabId = `tab-${Date.now()}-${Math.random().toString(36).slice(2)}`;
const memoryCache = new Map<string, CachedObjectUrl>();
const inFlight = new Map<string, InFlightPhotoRequest>();
const waiters = new Map<string, Set<() => void>>();
const channel = typeof BroadcastChannel !== "undefined" ? new BroadcastChannel("researchpal-photo-cache") : null;
let dbPromise: Promise<IDBDatabase> | null = null;

function getCurrentUserId() {
  try {
    const raw = localStorage.getItem("researchpal_user");
    if (!raw) return "anonymous";
    const user = JSON.parse(raw) as { _id?: string; id?: string; userId?: string; email?: string };
    return String(user._id || user.id || user.userId || user.email || "anonymous");
  } catch {
    return "anonymous";
  }
}

function normalizeKeyPart(value: unknown) {
  return String(value || "unknown").trim();
}

export function canonicalPhotoCacheKey(photo: PhotoMetadata, variant: PhotoVariant) {
  const userId = normalizeKeyPart(photo.userId || getCurrentUserId());
  const deviceId = normalizeKeyPart(photo.sourceDeviceId);
  const photoId = normalizeKeyPart(photo.photoId);
  const manifestVersion = normalizeKeyPart(photo.manifestVersion || photo.capturedAt || CACHE_VERSION);
  return `${userId}:${deviceId}:${photoId}:${variant}:${manifestVersion}:${CACHE_VERSION}`;
}

function openDb() {
  if (dbPromise) return dbPromise;
  dbPromise = new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) db.createObjectStore(STORE_NAME, { keyPath: "key" });
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error || new Error("Unable to open photo cache."));
  });
  return dbPromise;
}

async function readCachedBlob(key: string) {
  const memory = memoryCache.get(key);
  if (memory) return memory.blob;

  const db = await openDb();
  return new Promise<Blob | null>((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, "readonly");
    const request = transaction.objectStore(STORE_NAME).get(key);
    request.onsuccess = () => resolve((request.result as CachedPhotoRecord | undefined)?.blob || null);
    request.onerror = () => reject(request.error || new Error("Unable to read cached photo."));
  });
}

async function writeCachedBlob(key: string, blob: Blob) {
  const db = await openDb();
  await new Promise<void>((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, "readwrite");
    transaction.objectStore(STORE_NAME).put({ key, blob, updatedAt: Date.now() } satisfies CachedPhotoRecord);
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error || new Error("Unable to cache photo."));
  });
}

function objectUrlFor(key: string, blob: Blob) {
  const existing = memoryCache.get(key);
  if (existing && existing.blob === blob) return existing;

  if (existing) URL.revokeObjectURL(existing.url);
  const next = { url: URL.createObjectURL(blob), blob, objectUrlCreatedAt: performance.now() };
  memoryCache.set(key, next);
  return next;
}

function notifyWaiters(key: string) {
  const keyWaiters = waiters.get(key);
  if (!keyWaiters) return;
  keyWaiters.forEach(resolve => resolve());
  waiters.delete(key);
}

function broadcast(message: PhotoCacheMessage) {
  channel?.postMessage(message);
}

function photoCacheLog(message: string, data: Record<string, unknown>) {
  if (import.meta.env.DEV) console.log(`[PHOTO CACHE] ${message} ${JSON.stringify(data)}`);
}

function photoLogoutLog(data: Record<string, unknown>) {
  if (import.meta.env.DEV) console.log(`[PHOTO LOGOUT] ${JSON.stringify(data)}`);
}

function throwIfAborted(signal: AbortSignal) {
  if (signal.aborted) throw new Error("Photo stream cancelled.");
}

channel?.addEventListener("message", (event: MessageEvent<PhotoCacheMessage>) => {
  if (!event.data || event.data.ownerId === tabId) return;
  if (event.data.type === "ready" || event.data.type === "failed") notifyWaiters(event.data.key);
});

function waitForBroadcast(key: string, signal: AbortSignal) {
  return new Promise<void>((resolve) => {
    if (signal.aborted) {
      resolve();
      return;
    }
    const timeout = window.setTimeout(resolve, WAIT_TIMEOUT_MS);
    const wrappedResolve = () => {
      window.clearTimeout(timeout);
      signal.removeEventListener("abort", wrappedResolve);
      resolve();
    };
    const keyWaiters = waiters.get(key) || new Set<() => void>();
    keyWaiters.add(wrappedResolve);
    waiters.set(key, keyWaiters);
    signal.addEventListener("abort", wrappedResolve, { once: true });
  });
}

function lockKey(key: string) {
  return `researchpal-photo-fetch:${key}`;
}

function acquireLocalStorageLock(key: string) {
  const storageKey = lockKey(key);
  const now = Date.now();
  try {
    const existing = JSON.parse(localStorage.getItem(storageKey) || "null") as { ownerId?: string; expiresAt?: number } | null;
    if (existing?.ownerId && existing.expiresAt && existing.expiresAt > now && existing.ownerId !== tabId) return false;
    localStorage.setItem(storageKey, JSON.stringify({ ownerId: tabId, expiresAt: now + LOCK_TTL_MS }));
    const current = JSON.parse(localStorage.getItem(storageKey) || "null") as { ownerId?: string } | null;
    return current?.ownerId === tabId;
  } catch {
    return true;
  }
}

function releaseLocalStorageLock(key: string) {
  try {
    const storageKey = lockKey(key);
    const existing = JSON.parse(localStorage.getItem(storageKey) || "null") as { ownerId?: string } | null;
    if (existing?.ownerId === tabId) localStorage.removeItem(storageKey);
  } catch {
    // Best effort only; stale locks expire.
  }
}

async function streamAndCachePhoto(photo: PhotoMetadata, variant: PhotoVariant, key: string, onProgress: ProgressHandler, signal: AbortSignal) {
  throwIfAborted(signal);
  broadcast({ type: "fetching", key, ownerId: tabId, sentAt: Date.now() });
  const run = () => streamPhotoFromMobile(photo, variant, onProgress, signal);
  const blob = variant === "thumbnail" ? await enqueueThumbnailTransfer(run, signal) : await run();
  throwIfAborted(signal);
  await writeCachedBlob(key, blob);
  broadcast({ type: "ready", key, ownerId: tabId, sentAt: Date.now() });
  notifyWaiters(key);
  return objectUrlFor(key, blob);
}

async function resolveWithLocalStorageLock(photo: PhotoMetadata, variant: PhotoVariant, key: string, onProgress: ProgressHandler, signal: AbortSignal) {
  throwIfAborted(signal);
  if (!acquireLocalStorageLock(key)) {
    photoCacheLog("waiting-for-tab", { key, variant, photoId: photo.photoId });
    await waitForBroadcast(key, signal);
    throwIfAborted(signal);
    const cached = await readCachedBlob(key);
    if (cached) return objectUrlFor(key, cached);
  }

  try {
    const cached = await readCachedBlob(key);
    if (cached) return objectUrlFor(key, cached);
    return await streamAndCachePhoto(photo, variant, key, onProgress, signal);
  } catch (error) {
    broadcast({ type: "failed", key, ownerId: tabId, error: error instanceof Error ? error.message : String(error), sentAt: Date.now() });
    throw error;
  } finally {
    releaseLocalStorageLock(key);
  }
}

async function resolveWithWebLock(photo: PhotoMetadata, variant: PhotoVariant, key: string, onProgress: ProgressHandler, signal: AbortSignal) {
  const locks = (navigator as Navigator & { locks?: { request: <T>(name: string, callback: () => Promise<T>) => Promise<T> } }).locks;
  if (!locks) return resolveWithLocalStorageLock(photo, variant, key, onProgress, signal);

  return locks.request(lockKey(key), async () => {
    throwIfAborted(signal);
    const cached = await readCachedBlob(key);
    if (cached) return objectUrlFor(key, cached);
    return streamAndCachePhoto(photo, variant, key, onProgress, signal);
  });
}

function waitForSharedRequest<T>(promise: Promise<T>, signal: AbortSignal) {
  if (signal.aborted) return Promise.reject(new Error("Photo stream cancelled."));

  return new Promise<T>((resolve, reject) => {
    const abort = () => reject(new Error("Photo stream cancelled."));
    signal.addEventListener("abort", abort, { once: true });
    promise
      .then(resolve, reject)
      .finally(() => signal.removeEventListener("abort", abort));
  });
}

export async function resolvePhotoObjectUrl(
  photo: PhotoMetadata,
  variant: PhotoVariant,
  onProgress: ProgressHandler,
  signal: AbortSignal,
) {
  const key = canonicalPhotoCacheKey(photo, variant);
  photoCacheLog("resolve", { key, photoId: photo.photoId, variant });
  const memory = memoryCache.get(key);
  if (memory) {
    photoCacheLog("resolve", { source: "memory-hit", cacheKey: key, key, photoId: photo.photoId, variant, blobBytes: memory.blob.size });
    return { ...memory, cacheKey: key, cacheHit: true };
  }

  const cached = await readCachedBlob(key);
  if (cached) {
    photoCacheLog("resolve", { source: "indexeddb-hit", cacheKey: key, key, photoId: photo.photoId, variant, blobBytes: cached.size });
    return { ...objectUrlFor(key, cached), cacheKey: key, cacheHit: true };
  }

  const existing = inFlight.get(key);
  if (existing && Date.now() - existing.startedAt <= IN_FLIGHT_TTL_MS) {
    photoCacheLog("resolve", { source: "shared-fetch-wait", cacheKey: key, key, photoId: photo.photoId, variant, ageMs: Date.now() - existing.startedAt });
    return { ...(await waitForSharedRequest(existing.promise, signal)), cacheKey: key, cacheHit: true };
  }
  if (existing) {
    photoCacheLog("in-flight-expired", { key, photoId: photo.photoId, variant, ageMs: Date.now() - existing.startedAt });
    inFlight.delete(key);
  }

  const requestController = new AbortController();
  const requestTimeout = window.setTimeout(() => {
    requestController.abort();
  }, IN_FLIGHT_TTL_MS);
  const request = resolveWithWebLock(photo, variant, key, onProgress, requestController.signal).finally(() => {
    window.clearTimeout(requestTimeout);
    inFlight.delete(key);
  });
  inFlight.set(key, { promise: request, startedAt: Date.now() });
  photoCacheLog("resolve", { source: "webrtc-fetch", cacheKey: key, key, photoId: photo.photoId, variant });
  return { ...(await waitForSharedRequest(request, signal)), cacheKey: key, cacheHit: false };
}

export async function clearPhotoCacheForUser(userId?: string | null) {
  const normalizedUserId = normalizeKeyPart(userId || getCurrentUserId());
  let objectUrlsRevoked = 0;
  let memoryEntriesCleared = 0;
  for (const [key, value] of Array.from(memoryCache.entries())) {
    if (!key.startsWith(`${normalizedUserId}:`)) continue;
    URL.revokeObjectURL(value.url);
    memoryCache.delete(key);
    objectUrlsRevoked += 1;
    memoryEntriesCleared += 1;
  }

  let inFlightCleared = 0;
  for (const key of Array.from(inFlight.keys())) {
    if (!key.startsWith(`${normalizedUserId}:`)) continue;
    inFlight.delete(key);
    inFlightCleared += 1;
  }

  let waitersCleared = 0;
  for (const key of Array.from(waiters.keys())) {
    if (!key.startsWith(`${normalizedUserId}:`)) continue;
    notifyWaiters(key);
    waitersCleared += 1;
  }

  let locksCleared = 0;
  const lockPrefix = `researchpal-photo-fetch:${normalizedUserId}:`;
  for (let index = localStorage.length - 1; index >= 0; index -= 1) {
    const key = localStorage.key(index);
    if (key?.startsWith(lockPrefix)) {
      localStorage.removeItem(key);
      locksCleared += 1;
    }
  }

  let indexedDbEntriesCleared = 0;
  try {
    const db = await openDb();
    indexedDbEntriesCleared = await new Promise<number>((resolve, reject) => {
      const transaction = db.transaction(STORE_NAME, "readwrite");
      const store = transaction.objectStore(STORE_NAME);
      const request = store.openCursor();
      let deleted = 0;
      request.onsuccess = () => {
        const cursor = request.result;
        if (!cursor) return;
        const record = cursor.value as CachedPhotoRecord | undefined;
        if (record?.key?.startsWith(`${normalizedUserId}:`)) {
          cursor.delete();
          deleted += 1;
        }
        cursor.continue();
      };
      transaction.oncomplete = () => resolve(deleted);
      transaction.onerror = () => reject(transaction.error || new Error("Unable to clear photo cache."));
    });
  } catch (error) {
    photoCacheLog("logout-clear-failed", { userId: normalizedUserId, error: error instanceof Error ? error.message : String(error) });
  }

  photoLogoutLog({
    userId: normalizedUserId,
    memoryEntriesCleared,
    indexedDbEntriesCleared,
    objectUrlsRevoked,
    inFlightCleared,
    broadcastLocksCleared: locksCleared,
    waitersCleared,
  });
}
