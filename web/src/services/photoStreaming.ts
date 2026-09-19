import { API_BASE_URL, api, getStoredAccessToken, getWebDeviceId, getWebTabId } from "@/services/api";
import {
  base64UrlToBytes,
  createPhotoStreamKey,
  decryptPhotoChunkBytes,
  type PhotoStreamKey,
} from "@/lib/photoStreamCrypto";

export type PhotoMetadata = {
  photoId: string;
  userId?: string;
  projectId: string;
  plotId: string;
  noteId: string;
  sourceDeviceId: string | null;
  capturedAt: string;
  mimeType: string;
  projectTitle?: string | null;
  plotTitle?: string | null;
  replication?: number;
  treatment?: number;
  notePreview?: string;
  deviceAvailable: boolean;
  manifestVersion?: string | null;
};

export type PhotoDevice = {
  deviceId: string;
  clientType: "mobile" | "web";
  model?: string;
  platform?: string;
  availablePhotoIds?: string[];
  manifestVersion?: string;
  available: boolean;
  lastSeenAt: string;
};

type Signal = {
  id: string;
  fromDeviceId: string;
  type: "photo-access-request" | "photo-access-response" | "photo-manifest-changed" | "offer" | "answer" | "ice-candidate" | "hangup" | "error";
  payload: unknown;
};

type SessionSignalPayload = {
  connectionId?: string;
  senderDeviceId?: string;
  targetDeviceId?: string;
};

type TransferControl =
  | { type: "PHOTO_REQUEST"; transferId: string; photoId: string; accessSessionId: string; requestedVariant: "thumbnail" | "original"; streamKey?: string; encryptionMode?: "aes-gcm" | "none"; clientSentAt?: number }
  | { type: "PHOTO_READY"; sentAt: number }
  | { type: "PHOTO_START"; transferId: string; photoId: string; mimeType: string; totalBytes: number; totalChunks: number; variant: "thumbnail" | "original"; encryptionMode?: "aes-gcm" | "none"; clientSentAt?: number; mobileReceivedAt?: number; fileReadStart?: number; fileReadFinished?: number }
  | { type: "PHOTO_CHUNK"; transferId: string; photoId: string; chunkIndex: number; byteLength: number; iv?: string }
  | { type: "PHOTO_END"; transferId: string; photoId: string; encryptionMs?: number; mobileReceivedAt?: number; fileReadStart?: number; fileReadFinished?: number; firstChunkSent?: number; lastChunkSent?: number }
  | { type: "PHOTO_ERROR"; transferId?: string; photoId?: string; code: string };

type PhotoPerfTimings = {
  mobileReceivedAt?: number;
  fileReadStart?: number;
  fileReadFinished?: number;
  firstChunkSent?: number;
  lastChunkSent?: number;
  encryptionMs?: number;
};

type PendingTransfer = {
  transferId: string;
  photo: PhotoMetadata;
  variant: "thumbnail" | "original";
  key: PhotoStreamKey | null;
  clientSentAt: number;
  chunks: Map<number, Uint8Array>;
  totalBytes: number;
  totalChunks: number;
  transferredBytes: number;
  firstChunkReceivedAt: number;
  lastChunkReceivedAt: number;
  decryptMs: number;
  mobileTimings: PhotoPerfTimings;
  onProgress: (progress: { transferredBytes: number; totalBytes: number; chunksReceived: number; totalChunks: number }) => void;
  resolve: (blob: Blob) => void;
  reject: (error: Error) => void;
  timeout: number;
  nextChunk?: { chunkIndex: number; iv?: string; byteLength: number };
};

type PhotoSession = {
  sourceDeviceId: string;
  connectionId: string;
  tabId: string;
  accessSessionId: string;
  peer: RTCPeerConnection;
  channel: RTCDataChannel;
  signalController: AbortController;
  pendingRemoteCandidates: RTCIceCandidateInit[];
  remoteDescriptionReady: boolean;
  ready: Promise<void>;
  readyResolve: () => void;
  readyReject: (error: Error) => void;
  transfers: Map<string, PendingTransfer>;
  processedAnswerIds: Set<string>;
  closed: boolean;
  createdAt: number;
  mobileReady: boolean;
  mobileReadyPromise: Promise<void>;
  mobileReadyResolve: () => void;
};

const sessions = new Map<string, PhotoSession>();
const accessSessions = new Map<string, Promise<string>>();
const accessRejections = new Map<string, string>();
const signalSubscribers = new Set<(message: Signal) => void>();
let signalStreamController: AbortController | null = null;
let signalStreamPromise: Promise<void> | null = null;

function appEncryptionEnabled() {
  return new URLSearchParams(window.location.search).get("photoPerf") !== "transport";
}

function logPhotoPerf(label: string, data: Record<string, unknown>) {
  if (import.meta.env.DEV) console.log(`PHOTO PERF ${label} ${JSON.stringify(data)}`);
}

function logSignal(type: Signal["type"]) {
  if (import.meta.env.DEV) console.log(`[PHOTO SIGNAL] ${type}`);
}

function logWebRtcPhotoEvent(type: TransferControl["type"], data: Record<string, unknown>) {
  if (import.meta.env.DEV) console.log(`[WEBRTC PHOTO] ${type} ${JSON.stringify(data)}`);
}

function logPhotoConnection(message: string, data?: Record<string, unknown>) {
  if (import.meta.env.DEV) console.log(`[WEBRTC PHOTO] ${message}`, data || {});
}

function logPhotoLogout(data: Record<string, unknown>) {
  if (import.meta.env.DEV) console.log(`[PHOTO LOGOUT] ${JSON.stringify(data)}`);
}

function logPhotoManifest(message: string, data?: Record<string, unknown>) {
  if (import.meta.env.DEV) console.log(`[PHOTO MANIFEST] ${message} ${JSON.stringify(data || {})}`);
}

function parseSseEvents(buffer: string) {
  const messages: Signal[] = [];
  const events = buffer.split(/\n\n/);
  const remaining = events.pop() || "";

  for (const event of events) {
    const dataLines = event
      .split(/\n/)
      .filter(line => line.startsWith("data:"))
      .map(line => line.slice(5).trimStart());
    if (!dataLines.length) continue;
    try {
      messages.push(JSON.parse(dataLines.join("\n")) as Signal);
    } catch (error) {
      if (import.meta.env.DEV) console.error("[SIGNAL] malformed stream event", error);
    }
  }

  return { messages, remaining };
}

async function runSignalStream(controller: AbortController) {
  const token = getStoredAccessToken();
  if (!token) throw new Error("Please sign in again to continue.");

  const url = `${API_BASE_URL}photos/signals/stream?deviceId=${encodeURIComponent(getWebDeviceId())}`;
  const response = await fetch(url, {
    headers: {
      Accept: "text/event-stream",
      Authorization: `Bearer ${token}`,
      "Cache-Control": "no-cache",
      "X-Client-Type": "web",
      "X-Device-Id": getWebDeviceId(),
      "X-Device-Platform": "web",
    },
    signal: controller.signal,
  });

  if (response.status === 401 || response.status === 403) {
    throw new Error("Please sign in again to continue.");
  }
  if (!response.ok || !response.body) {
    throw new Error("Unable to connect to photo signalling.");
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  while (!controller.signal.aborted) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const parsed = parseSseEvents(buffer);
    buffer = parsed.remaining;
    parsed.messages.forEach(message => {
      signalSubscribers.forEach(subscriber => subscriber(message));
    });
  }
}

function ensureSignalStream() {
  if (signalStreamPromise) return;
  signalStreamController = new AbortController();
  signalStreamPromise = runSignalStream(signalStreamController).finally(() => {
    signalStreamPromise = null;
    signalStreamController = null;
  });
  signalStreamPromise.catch(error => {
    if (signalSubscribers.size && import.meta.env.DEV) console.error("[SIGNAL] stream closed", error);
  });
}

function subscribeSignals(onSignal: (message: Signal) => void) {
  signalSubscribers.add(onSignal);
  ensureSignalStream();

  return () => {
    signalSubscribers.delete(onSignal);
    if (!signalSubscribers.size) {
      signalStreamController?.abort();
      signalStreamController = null;
      signalStreamPromise = null;
    }
  };
}

async function dataToBytes(data: string | ArrayBuffer | Blob) {
  if (typeof data === "string") return null;
  if (data instanceof ArrayBuffer) return new Uint8Array(data);
  return new Uint8Array(await data.arrayBuffer());
}

export async function getPhotoLibrary() {
  const response = await api.get("/photos/library");
  return response.data as { photos: PhotoMetadata[]; devices: PhotoDevice[] };
}

export async function registerWebPhotoDevice() {
  const response = await api.post("/photos/devices", {
    deviceId: getWebDeviceId(),
    clientType: "web",
    platform: navigator.platform || "web",
  });
  return response.data as { devices: PhotoDevice[] };
}

export async function triggerPhotoAccessNotification(sourceDeviceId?: string | null) {
  await api.post("/photos/access-notification", sourceDeviceId ? { deviceId: sourceDeviceId } : {});
}

export function resetPhotoAccessDecisions() {
  accessRejections.clear();
}

export function clearPhotoStreamingState(reason = "logout") {
  const connectionsClosed = sessions.size;
  sessions.forEach(session => {
    closeSession(session, new Error("Photo session ended."));
  });
  sessions.clear();
  accessSessions.clear();
  accessRejections.clear();
  signalSubscribers.clear();
  signalStreamController?.abort();
  signalStreamController = null;
  signalStreamPromise = null;
  logPhotoLogout({
    reason,
    connectionsClosed,
    manifestsCleared: true,
    pendingAccessRequestsCleared: true,
  });
}

export function subscribePhotoManifestChanges(onChange: () => void) {
  return subscribeSignals(message => {
    if (message.type !== "photo-manifest-changed") return;
    const payload = message.payload && typeof message.payload === "object"
      ? message.payload as { manifestVersion?: string; photoCount?: number }
      : {};
    logPhotoManifest("changed", {
      deviceId: message.fromDeviceId,
      manifestVersion: payload.manifestVersion,
      photoCount: payload.photoCount,
    });
    onChange();
  });
}

async function postSignal(toDeviceId: string, type: Signal["type"], payload: unknown, photoId?: string) {
  logSignal(type);
  await api.post("/photos/signals", {
    fromDeviceId: getWebDeviceId(),
    toDeviceId,
    type,
    photoId,
    payload,
  });
}

function makeConnectionId(sourceDeviceId: string) {
  return `photo-conn-${getWebTabId()}-${sourceDeviceId}-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function sessionSignalPayload(session: PhotoSession, payload: object) {
  return {
    ...payload,
    connectionId: session.connectionId,
    senderDeviceId: getWebTabId(),
    targetDeviceId: session.sourceDeviceId,
  };
}

function parseSessionPayload(payload: unknown) {
  return payload && typeof payload === "object" ? payload as SessionSignalPayload : {};
}

function isSignalForSession(session: PhotoSession, message: Signal) {
  const payload = parseSessionPayload(message.payload);
  if (payload.connectionId !== session.connectionId) {
    logPhotoConnection("ignoring signal", {
      reason: "connection-id-mismatch",
      type: message.type,
      messageConnectionId: payload.connectionId,
      activeConnectionId: session.connectionId,
      sourceDeviceId: session.sourceDeviceId,
    });
    return false;
  }
  if (payload.targetDeviceId && payload.targetDeviceId !== getWebTabId()) {
    logPhotoConnection("ignoring signal", {
      reason: "target-tab-mismatch",
      type: message.type,
      connectionId: session.connectionId,
      targetDeviceId: payload.targetDeviceId,
      tabId: getWebTabId(),
    });
    return false;
  }
  return true;
}

function accessDeclinedMessage(reason?: string) {
  if (reason === "disabled") {
    return "Web photo access is disabled on your phone. Change Settings -> Privacy & Security -> Web photo access to enable it.";
  }
  return "Photo access was declined on your phone.";
}

async function waitForPhotoAccess(sourceDeviceId: string) {
  const rejected = accessRejections.get(sourceDeviceId);
  if (rejected) throw new Error(rejected);
  const existing = accessSessions.get(sourceDeviceId);
  if (existing) return existing;

  const request = (async (): Promise<string> => {
    const devicesResponse = await api.get("/photos/devices");
    const mobile = (devicesResponse.data?.devices || []).find((device: PhotoDevice) =>
      device.clientType === "mobile" && device.available && device.deviceId === sourceDeviceId
    );

    if (!mobile) {
      await triggerPhotoAccessNotification(sourceDeviceId).catch(() => null);
      throw new Error("Open ResearchPal on your phone. Your photos are stored on your phone. Open ResearchPal and approve web photo access to continue.");
    }

    const sessionId = `photo-access-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    await postSignal(sourceDeviceId, "photo-access-request", { sessionId });
    return new Promise<string>((resolve, reject) => {
      const timeout = window.setTimeout(() => {
        unsubscribe();
        reject(new Error("Photo access request timed out. Open ResearchPal on your phone and try again."));
      }, 30_000);
      const unsubscribe = subscribeSignals(message => {
        if (message.fromDeviceId !== sourceDeviceId) return;
        logSignal(message.type);
        if (message.type !== "photo-access-response") return;
        const payload = message.payload && typeof message.payload === "object"
          ? message.payload as { sessionId?: string; decision?: string; reason?: string }
          : {};
        if (payload.sessionId !== sessionId) return;
        window.clearTimeout(timeout);
        unsubscribe();
        if (payload.decision === "approved") {
          resolve(sessionId);
          return;
        }
        const declineMessage = accessDeclinedMessage(payload.reason);
        accessRejections.set(sourceDeviceId, declineMessage);
        reject(new Error(declineMessage));
      });
    });
  })().catch(error => {
    accessSessions.delete(sourceDeviceId);
    throw error;
  });

  accessSessions.set(sourceDeviceId, request);
  return request;
}

async function addRemoteCandidate(session: PhotoSession, candidate: RTCIceCandidateInit) {
  if (session.closed || session.peer.signalingState === "closed") return;
  if (!session.remoteDescriptionReady) {
    session.pendingRemoteCandidates.push(candidate);
    return;
  }
  await session.peer.addIceCandidate(candidate);
}

async function applyRemoteAnswer(session: PhotoSession, answer: RTCSessionDescriptionInit, messageId: string) {
  if (session.closed || session.peer.signalingState === "closed") return;
  if (session.processedAnswerIds.has(messageId)) {
    logPhotoConnection("ignoring answer", {
      reason: "duplicate-answer",
      connectionId: session.connectionId,
      messageId,
      state: session.peer.signalingState,
    });
    return;
  }
  if (session.remoteDescriptionReady || session.peer.signalingState !== "have-local-offer") {
    logPhotoConnection("ignoring answer", {
      reason: "unexpected-signaling-state",
      connectionId: session.connectionId,
      messageId,
      state: session.peer.signalingState,
    });
    session.processedAnswerIds.add(messageId);
    return;
  }
  session.processedAnswerIds.add(messageId);
  await session.peer.setRemoteDescription(answer);
  session.remoteDescriptionReady = true;
  while (session.pendingRemoteCandidates.length > 0) {
    const candidate = session.pendingRemoteCandidates.shift();
    if (candidate) await session.peer.addIceCandidate(candidate);
  }
}

function closeSession(session: PhotoSession, error?: Error) {
  if (session.closed) return;
  session.closed = true;
  session.signalController.abort();
  session.readyReject(error || new Error("Photo connection closed."));
  session.transfers.forEach(transfer => {
    window.clearTimeout(transfer.timeout);
    transfer.reject(error || new Error("Photo connection closed."));
  });
  session.transfers.clear();
  try { session.channel.close(); } catch { /* already closed */ }
  try { session.peer.close(); } catch { /* already closed */ }
  sessions.delete(session.sourceDeviceId);
}

function sessionState(session: PhotoSession) {
  return {
    sourceDeviceId: session.sourceDeviceId,
    connectionId: session.connectionId,
    tabId: session.tabId,
    connectionState: session.peer.connectionState,
    iceConnectionState: session.peer.iceConnectionState,
    signalingState: session.peer.signalingState,
    dataChannelState: session.channel.readyState,
    mobileReady: session.mobileReady,
    pendingTransfers: session.transfers.size,
    sessionAgeMs: Date.now() - session.createdAt,
  };
}

function subscribeSessionSignals(session: PhotoSession) {
  const unsubscribe = subscribeSignals(message => {
    if (message.fromDeviceId !== session.sourceDeviceId) return;
    logSignal(message.type);
    void (async () => {
      if (!isSignalForSession(session, message)) return;
      if (message.type === "answer") await applyRemoteAnswer(session, message.payload as RTCSessionDescriptionInit, message.id);
      if (message.type === "ice-candidate") await addRemoteCandidate(session, message.payload as RTCIceCandidateInit);
      if (message.type === "error") {
        const payload = message.payload && typeof message.payload === "object" ? message.payload as { code?: string } : {};
        closeSession(session, new Error(payload.code || "Unable to establish a photo connection with your phone."));
      }
    })().catch(error => closeSession(session, error instanceof Error ? error : new Error(String(error))));
  });

  session.signalController.signal.addEventListener("abort", unsubscribe, { once: true });
  return unsubscribe;
}

function parseControl(data: string | ArrayBuffer | Blob) {
  if (typeof data !== "string") return null;
  return JSON.parse(data) as TransferControl;
}

async function handleBinaryChunk(session: PhotoSession, bytes: Uint8Array) {
  const transfer = Array.from(session.transfers.values()).find(item => item.nextChunk);
  if (!transfer?.nextChunk) throw new Error("Received photo bytes without chunk metadata.");
  const chunk = transfer.nextChunk;
  transfer.nextChunk = undefined;
  if (bytes.byteLength !== chunk.byteLength) throw new Error("Malformed photo chunk.");

  const decryptStart = Date.now();
  const decoded = transfer.key
    ? await decryptPhotoChunkBytes(transfer.key, { iv: base64UrlToBytes(chunk.iv || ""), data: bytes }, {
      transferId: transfer.transferId,
      photoId: transfer.photo.photoId,
      chunkIndex: chunk.chunkIndex,
      variant: transfer.variant,
    })
    : bytes;

  transfer.decryptMs += Date.now() - decryptStart;
  transfer.lastChunkReceivedAt = Date.now();
  if (!transfer.firstChunkReceivedAt) transfer.firstChunkReceivedAt = transfer.lastChunkReceivedAt;
  transfer.chunks.set(chunk.chunkIndex, decoded);
  transfer.transferredBytes += decoded.byteLength;
  transfer.onProgress({
    transferredBytes: transfer.transferredBytes,
    totalBytes: transfer.totalBytes,
    chunksReceived: transfer.chunks.size,
    totalChunks: transfer.totalChunks,
  });
}

function completeTransfer(session: PhotoSession, transferId: string, message: Extract<TransferControl, { type: "PHOTO_END" }>) {
  const transfer = session.transfers.get(transferId);
  if (!transfer) return;
  transfer.mobileTimings = { ...transfer.mobileTimings, ...message };
  if (transfer.chunks.size !== transfer.totalChunks) {
    transfer.reject(new Error("Transfer interrupted."));
    session.transfers.delete(transferId);
    return;
  }
  const ordered = Array.from({ length: transfer.totalChunks }, (_, index) => transfer.chunks.get(index));
  if (ordered.some(chunk => !chunk)) {
    transfer.reject(new Error("Malformed photo chunks."));
    session.transfers.delete(transferId);
    return;
  }
  window.clearTimeout(transfer.timeout);
  const reassemblyStart = Date.now();
  const blob = new Blob((ordered as Uint8Array[]).map(chunk => new Uint8Array(chunk)), { type: transfer.photo.mimeType || "image/jpeg" });
  const blobFinishedAt = Date.now();
  logPhotoPerf("datachannel", {
    mode: transfer.key ? "aes-gcm" : "transport-only",
    photoSizeKB: Math.round(transfer.totalBytes / 1024),
    requestToMobileReceivedMs: transfer.mobileTimings.mobileReceivedAt ? transfer.mobileTimings.mobileReceivedAt - transfer.clientSentAt : null,
    fileReadMs: transfer.mobileTimings.fileReadFinished && transfer.mobileTimings.fileReadStart ? transfer.mobileTimings.fileReadFinished - transfer.mobileTimings.fileReadStart : null,
    encryptionMs: transfer.mobileTimings.encryptionMs ?? null,
    chunkTransferMs: transfer.firstChunkReceivedAt && transfer.lastChunkReceivedAt ? transfer.lastChunkReceivedAt - transfer.firstChunkReceivedAt : null,
    decryptionMs: transfer.decryptMs,
    reassemblyBlobMs: blobFinishedAt - reassemblyStart,
    totalMs: blobFinishedAt - transfer.clientSentAt,
  });
  transfer.resolve(blob);
  session.transfers.delete(transferId);
}

function handleControl(session: PhotoSession, message: TransferControl) {
  if (message.type !== "PHOTO_CHUNK") {
    logWebRtcPhotoEvent(message.type, "photoId" in message ? { photoId: message.photoId, transferId: message.transferId } : {});
  }
  if (message.type === "PHOTO_ERROR") {
    const transfer = message.transferId ? session.transfers.get(message.transferId) : undefined;
    transfer?.reject(new Error(message.code));
    if (message.transferId) session.transfers.delete(message.transferId);
    return;
  }
  if (message.type === "PHOTO_READY") {
    session.mobileReady = true;
    session.mobileReadyResolve();
    logPhotoConnection("mobile-ready", sessionState(session));
    return;
  }
  if (message.type === "PHOTO_START") {
    const transfer = session.transfers.get(message.transferId);
    if (!transfer) return;
    transfer.mobileTimings = { ...transfer.mobileTimings, ...message };
    transfer.totalBytes = Number(message.totalBytes || 0);
    transfer.totalChunks = Number(message.totalChunks || 0);
    transfer.onProgress({ transferredBytes: 0, totalBytes: transfer.totalBytes, chunksReceived: 0, totalChunks: transfer.totalChunks });
    return;
  }
  if (message.type === "PHOTO_CHUNK") {
    const transfer = session.transfers.get(message.transferId);
    if (!transfer) return;
    transfer.nextChunk = { chunkIndex: message.chunkIndex, iv: message.iv, byteLength: message.byteLength };
    return;
  }
  if (message.type === "PHOTO_END") {
    completeTransfer(session, message.transferId, message);
  }
}

async function getPhotoSession(sourceDeviceId: string, photoId?: string) {
  const accessSessionId = await waitForPhotoAccess(sourceDeviceId);
  const existing = sessions.get(sourceDeviceId);
  if (existing && !existing.closed && existing.channel.readyState === "open" && existing.accessSessionId === accessSessionId) {
    logPhotoConnection("reuse-open-session", sessionState(existing));
    return existing;
  }
  if (existing && !existing.closed) {
    logPhotoConnection("await-existing-session", sessionState(existing));
    await existing.ready;
    return existing;
  }

  let readyResolve!: () => void;
  let readyReject!: (error: Error) => void;
  let mobileReadyResolve!: () => void;
  const peer = new RTCPeerConnection({ iceServers: [{ urls: "stun:stun.l.google.com:19302" }] });
  const channel = peer.createDataChannel("researchpal-photo-stream", { ordered: true });
  const connectionId = makeConnectionId(sourceDeviceId);
  channel.binaryType = "arraybuffer";
  const session: PhotoSession = {
    sourceDeviceId,
    connectionId,
    tabId: getWebTabId(),
    accessSessionId,
    peer,
    channel,
    signalController: new AbortController(),
    pendingRemoteCandidates: [],
    remoteDescriptionReady: false,
    ready: new Promise<void>((resolve, reject) => {
      readyResolve = resolve;
      readyReject = reject;
    }),
    readyResolve,
    readyReject,
    transfers: new Map(),
    processedAnswerIds: new Set(),
    closed: false,
    createdAt: Date.now(),
    mobileReady: false,
    mobileReadyPromise: new Promise<void>((resolve) => {
      mobileReadyResolve = resolve;
    }),
    mobileReadyResolve,
  };
  sessions.set(sourceDeviceId, session);

  const connectTimeout = window.setTimeout(() => {
    closeSession(session, new Error("Unable to establish a photo connection with your phone. Make sure ResearchPal is open on the phone and try again."));
  }, 15_000);

  channel.onopen = () => {
    logPhotoConnection("datachannel-open", sessionState(session));
    window.clearTimeout(connectTimeout);
    session.readyResolve();
  };
  channel.onmessage = event => {
    void (async () => {
      const control = parseControl(event.data);
      if (control) {
        handleControl(session, control);
        return;
      }
      const bytes = await dataToBytes(event.data);
      if (bytes) await handleBinaryChunk(session, bytes);
    })().catch(error => closeSession(session, error instanceof Error ? error : new Error(String(error))));
  };
  channel.onerror = () => {
    logPhotoConnection("datachannel-error", sessionState(session));
    closeSession(session, new Error("Unable to establish a photo connection with your phone. Make sure ResearchPal is open on the phone and try again."));
  };
  channel.onclose = () => {
    logPhotoConnection("datachannel-close", sessionState(session));
    closeSession(session);
  };
  peer.onicecandidate = event => {
    if (event.candidate) void postSignal(sourceDeviceId, "ice-candidate", sessionSignalPayload(session, event.candidate.toJSON()), photoId);
  };
  peer.onconnectionstatechange = () => {
    logPhotoConnection("peer-state", sessionState(session));
    if (["failed", "closed", "disconnected"].includes(peer.connectionState)) {
      closeSession(session, new Error("Photo connection with your phone was lost. Try again with ResearchPal open on the phone."));
    }
  };

  subscribeSessionSignals(session);
  const offer = await peer.createOffer();
  await peer.setLocalDescription(offer);
  await postSignal(sourceDeviceId, "offer", sessionSignalPayload(session, offer), photoId);
  await session.ready;
  await Promise.race([
    session.mobileReadyPromise,
    new Promise(resolve => window.setTimeout(resolve, 1_000)),
  ]);
  return session;
}

export async function streamPhotoFromMobile(
  photo: PhotoMetadata,
  variant: "thumbnail" | "original",
  onProgress: (progress: { transferredBytes: number; totalBytes: number; chunksReceived: number; totalChunks: number }) => void,
  signal: AbortSignal,
) {
  if (!photo.sourceDeviceId) {
    await triggerPhotoAccessNotification(null).catch(() => null);
    throw new Error("Open ResearchPal on your phone. Your photos are stored on your phone. Open ResearchPal and approve web photo access to continue.");
  }
  const encrypted = appEncryptionEnabled();
  const keyMaterial = encrypted ? await createPhotoStreamKey() : null;
  const transferId = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  const session = await getPhotoSession(photo.sourceDeviceId, photo.photoId);
  if (session.channel.readyState !== "open") {
    throw new Error("Photo connection is not ready yet.");
  }
  const clientSentAt = Date.now();

  signal.addEventListener("abort", () => {
    const transfer = session.transfers.get(transferId);
    if (!transfer) return;
    window.clearTimeout(transfer.timeout);
    transfer.reject(new Error("Photo stream cancelled."));
    session.transfers.delete(transferId);
  }, { once: true });

  return new Promise<Blob>((resolve, reject) => {
    const timeout = window.setTimeout(() => {
      const error = new Error("Photo stream timed out. Make sure ResearchPal is open on the phone and try again.");
      closeSession(session, error);
      reject(error);
    }, 6_000);
    session.transfers.set(transferId, {
      transferId,
      photo,
      variant,
      key: keyMaterial?.key || null,
      clientSentAt,
      chunks: new Map(),
      totalBytes: 0,
      totalChunks: 0,
      transferredBytes: 0,
      firstChunkReceivedAt: 0,
      lastChunkReceivedAt: 0,
      decryptMs: 0,
      mobileTimings: {},
      onProgress,
      resolve,
      reject,
      timeout,
    });
    const request: TransferControl = {
      type: "PHOTO_REQUEST",
      transferId,
      photoId: photo.photoId,
      accessSessionId: session.accessSessionId,
      requestedVariant: variant,
      streamKey: keyMaterial?.rawKey,
      encryptionMode: encrypted ? "aes-gcm" : "none",
      clientSentAt,
    };
    logWebRtcPhotoEvent(request.type, { photoId: request.photoId, transferId, ...sessionState(session) });
    session.channel.send(JSON.stringify(request));
  });
}
